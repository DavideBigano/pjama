import { ConflictError } from "../lib/api.js";
import { escapeHtml } from "../lib/format.js";
import { getIntegrityProblems } from "../lib/integrity.js";
import { getUnverifiedSpecs } from "../lib/model.js";
import { closePopover, icon, inlineEdit, isPopoverOpen, isTyping, openDialog, pill, refreshIcons } from "./dom.js";

const DISK_POLL_MS = 3000;

/**
 * Top bar: editable project name, unverified-specs pill, save state and Save button. Also watches the
 * file on disk, reloading it when it changes and nothing is unsaved.
 */
export function createTopbar({ doc, api, onOpenSpec, onReloaded }) {
	const nameEl = document.getElementById("projName");
	const unverifiedEl = document.getElementById("unverified");
	const stateEl = document.getElementById("saveState");
	const saveBtn = document.getElementById("saveBtn");
	let savedAt = null, saving = false, diskChanged = false, saveError = null, menu = null;

	/** Text next to the Save button. */
	const getStateHtml = dirty => {
		if (saveError) return `<span class="dot err"></span>Save failed: ${escapeHtml(saveError)}`;
		if (diskChanged) return `<span class="dot"></span>File changed on disk`;
		if (saving) return "Saving…";
		if (dirty) return `<span class="dot"></span>Unsaved changes`;
		if (savedAt) return `Saved at ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
		return doc.exists ? "" : "New map · not saved yet";
	};

	/** Re-renders everything the top bar shows from the current map. */
	function refresh() {
		if (!nameEl.isContentEditable) nameEl.textContent = doc.map.label || "Untitled project";
		document.title = `${doc.map.label || "projMap"} · projMap editor`;
		const unverified = getUnverifiedSpecs(doc.map);
		unverifiedEl.hidden = !unverified.length;
		unverifiedEl.innerHTML = `${icon("shield-alert", 13)}${unverified.length} unverified`;
		const dirty = doc.isDirty();
		saveBtn.disabled = saving || (!dirty && doc.exists);
		stateEl.innerHTML = getStateHtml(dirty);
		refreshIcons();
	}

	/** Shows the list of unverified specs; picking one opens it on its component. */
	function toggleUnverifiedMenu() {
		if (menu) return closeUnverifiedMenu();
		const items = getUnverifiedSpecs(doc.map);
		menu = document.createElement("div");
		menu.className = "tb-menu";
		menu.innerHTML = items.map((item, i) => `<div class="tb-opt ${item.owner ? "" : "off"}" data-i="${i}">${icon(item.kind.icon, 15)}
			${pill(item.spec.id)}${escapeHtml(item.spec.label)}<span class="tb-owner">${escapeHtml(item.owner?.label ?? "unassigned")}</span></div>`).join("");
		document.body.appendChild(menu);
		const rect = unverifiedEl.getBoundingClientRect();
		menu.style.top = rect.bottom + 6 + "px";
		menu.style.left = Math.max(8, Math.min(rect.left, innerWidth - menu.offsetWidth - 8)) + "px";
		refreshIcons();
		menu.addEventListener("click", event => {
			const item = items[Number(event.target.closest(".tb-opt")?.dataset.i)];
			if (!item?.owner) return;
			closeUnverifiedMenu();
			onOpenSpec(item.owner.id, item.spec.id);
		});
	}

	/** Closes the unverified-specs list. */
	function closeUnverifiedMenu() {
		menu?.remove();
		menu = null;
	}

	/** Writes the map to disk, first warning about integrity problems and edits made by someone else. */
	async function save({ force = false, skipChecks = false } = {}) {
		if (saving || (!doc.isDirty() && doc.exists && !force)) return;
		const problems = skipChecks ? [] : getIntegrityProblems(doc.map);
		if (problems.length) {
			return openDialog({ title: "The map has consistency problems", intro: "Saving still works, but these should be fixed:", items: problems.slice(0, 12).concat(problems.length > 12 ? [`…and ${problems.length - 12} more`] : []),
				actions: [{ label: "Save anyway", variant: "primary", run: () => save({ force, skipChecks: true }) }] });
		}
		saving = true;
		saveError = null;
		refresh();
		try {
			const { version } = await api.save(doc.map, doc.version, force);
			doc.markSaved(version);
			savedAt = new Date();
			diskChanged = false;
		} catch (error) {
			if (error instanceof ConflictError) askAboutConflict();
			else saveError = error.message;
		} finally {
			saving = false;
			refresh();
		}
	}

	/** Lets the user choose between overwriting the file and taking its new content. */
	function askAboutConflict() {
		openDialog({
			title: "projMap.json changed on disk",
			intro: "Someone else (maybe the agent) edited the file since the editor loaded it.",
			items: ["Overwrite: save your version and drop their changes", "Reload: take the file as it is now and drop your unsaved changes"],
			actions: [
				{ label: "Reload", run: reload },
				{ label: "Overwrite", variant: "danger", run: () => save({ force: true, skipChecks: true }) },
			],
		});
	}

	/** Reads the file again and swaps it in. */
	async function reload() {
		const loaded = await api.load();
		doc.replace(loaded);
		diskChanged = false;
		saveError = null;
		onReloaded();
		refresh();
	}

	/** Checks whether the file changed on disk: reloads quietly when nothing is unsaved, otherwise flags it. */
	async function checkDisk() {
		if (saving || document.hidden) return;
		const askedFor = doc.version;
		let version;
		try { ({ version } = await api.getVersion()); } catch { return; }
		if (doc.version !== askedFor || version === doc.version) return;
		const busy = isTyping() || isPopoverOpen() || document.querySelector(".overlay");
		if (!doc.isDirty() && !busy) return reload();
		if (doc.isDirty() && !diskChanged) { diskChanged = true; refresh(); }
	}

	nameEl.addEventListener("click", () => {
		if (nameEl.isContentEditable) return;
		inlineEdit(nameEl, value => { if (value) doc.map.label = value; refresh(); }, refresh);
	});
	unverifiedEl.addEventListener("click", toggleUnverifiedMenu);
	document.addEventListener("mousedown", event => { if (menu && !menu.contains(event.target) && !event.target.closest("#unverified")) closeUnverifiedMenu(); });
	document.addEventListener("keydown", event => { if (event.key === "Escape") closeUnverifiedMenu(); });
	saveBtn.addEventListener("click", () => save());
	addEventListener("keydown", event => {
		if (!(event.ctrlKey || event.metaKey) || event.key !== "s") return;
		event.preventDefault();
		closePopover();
		document.activeElement?.blur();
		save();
	}, true);
	addEventListener("beforeunload", event => { if (doc.isDirty()) event.preventDefault(); });
	setInterval(checkDisk, DISK_POLL_MS);
	addEventListener("focus", checkDisk);
	document.addEventListener("focusout", () => setTimeout(refresh));

	return { refresh, save };
}
