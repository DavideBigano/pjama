import { escapeHtml } from "../lib/format.js";

/** Markup for a Lucide icon; `refreshIcons` turns it into an SVG. */
export const icon = (name, size = 16) => `<i data-lucide="${name}" style="width:${size}px;height:${size}px"></i>`;

/** Markup for an id pill; clicking it opens the item's page. */
export const pill = id => `<span class="pill" data-pill="${escapeHtml(id)}">${escapeHtml(id)}</span>`;

/** Replaces every pending icon placeholder in the page with its SVG. */
export const refreshIcons = () => globalThis.lucide?.createIcons({ attrs: { "stroke-width": 1.75 } });

/** Markdown rendered to sanitized HTML (line breaks kept). */
export const renderMarkdown = source => globalThis.DOMPurify.sanitize(globalThis.marked.parse(source, { breaks: true }));

/** Whether the user is typing in a field, so global shortcuts should stay out of the way. */
export const isTyping = () => document.activeElement?.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName ?? "");

/**
 * Turns an element into a plain-text editor in place. Enter commits (Ctrl/Cmd+Enter when multiline),
 * Escape restores the old text and cancels, leaving the field commits.
 */
export function inlineEdit(element, onCommit, onCancel, { multiline = false } = {}) {
	const before = element.innerText;
	element.setAttribute("contenteditable", "plaintext-only");
	element.focus();
	const range = document.createRange();
	range.selectNodeContents(element);
	range.collapse(false);
	getSelection().removeAllRanges();
	getSelection().addRange(range);
	let done = false;
	const finish = commit => {
		if (done) return;
		done = true;
		element.removeAttribute("contenteditable");
		element.removeEventListener("keydown", onKey);
		element.removeEventListener("blur", onBlur);
		if (commit) onCommit(element.innerText.trim());
		else { element.innerText = before; onCancel?.(); }
	};
	const onKey = event => {
		if ((event.ctrlKey || event.metaKey) && event.key === "s") return;
		event.stopPropagation();
		if (event.key === "Escape") { event.preventDefault(); finish(false); }
		else if (event.key === "Enter" && (!multiline || event.ctrlKey || event.metaKey)) { event.preventDefault(); finish(true); }
	};
	const onBlur = () => finish(true);
	element.addEventListener("keydown", onKey);
	element.addEventListener("blur", onBlur);
}

/** Selects all the text of the field being edited. */
export function selectAllText(element) {
	const range = document.createRange();
	range.selectNodeContents(element);
	getSelection().removeAllRanges();
	getSelection().addRange(range);
}

/* ---------- popovers: one at a time ---------- */

let openPopover = null;

/** Closes the open popover or menu, if any. */
export function closePopover() {
	openPopover?.remove();
	openPopover = null;
}

/** Whether a popover or menu is open. */
export const isPopoverOpen = () => !!openPopover;

document.addEventListener("mousedown", event => { if (openPopover && !openPopover.contains(event.target)) closePopover(); });
document.addEventListener("keydown", event => {
	if (event.key === "Escape" && openPopover) { closePopover(); event.stopImmediatePropagation(); }
}, true);

/** Adds a popover element to the page and makes it the open one. */
function mountPopover(className, html) {
	closePopover();
	openPopover = document.createElement("div");
	openPopover.className = className;
	openPopover.innerHTML = html;
	document.body.appendChild(openPopover);
	return openPopover;
}

/** Places a popover at a point, flipping above it when it would overflow the window. */
function placePopover(element, x, y) {
	element.style.left = Math.max(8, Math.min(x, innerWidth - element.offsetWidth - 8)) + "px";
	element.style.top = (y + element.offsetHeight > innerHeight - 8 ? Math.max(8, y - element.offsetHeight - 36) : y) + "px";
}

/** Places a popover right below an anchor element. */
const placeBelow = (element, anchor, gap = 6) => {
	const rect = anchor.getBoundingClientRect();
	placePopover(element, rect.left, rect.bottom + gap);
};

/**
 * Opens a menu at a point. Items are `{ icon, label, run, danger, on }` or "-" for a separator.
 */
export function openMenu(x, y, items) {
	const menu = mountPopover("pop menu", items.map((item, i) => item === "-" ? `<div class="sep"></div>`
		: `<div class="opt ${item.danger ? "danger" : ""} ${item.on ? "on" : ""}" data-i="${i}">${item.icon ? icon(item.icon) : ""}${escapeHtml(item.label)}${item.on ? `<span class="owner">${icon("check", 14)}</span>` : ""}</div>`).join(""));
	refreshIcons();
	placePopover(menu, x, y);
	menu.addEventListener("click", event => {
		const option = event.target.closest(".opt");
		if (!option) return;
		const item = items[Number(option.dataset.i)];
		closePopover();
		item.run();
	});
}

/** Opens a menu right below an anchor element. */
export function openMenuAt(anchor, items) {
	const rect = anchor.getBoundingClientRect();
	openMenu(rect.left, rect.bottom + 4, items);
}

/** Markup for one picker option. */
const optionHtml = option => `<div class="opt" data-v="${escapeHtml(option.id)}">${option.icon ? icon(option.icon) : ""}${option.id !== option.label ? pill(option.id) : ""}<span>${escapeHtml(option.label)}</span><span class="owner">${escapeHtml(option.owner ?? "")}</span></div>`;

/**
 * Opens a searchable picker below an anchor. Options are `{ id, label, owner, icon }`, optionally in
 * titled `groups`. With `createLabel`, it also offers to create an item from the search text
 * (or always, with `createAlways`).
 */
export function openPicker(anchor, { placeholder, options, groups = [{ items: options }], onPick, createLabel, onCreate, createAlways = false, limit = Infinity }) {
	const picker = mountPopover("pop", `<input placeholder="${escapeHtml(placeholder)}"><div class="opts"></div>`);
	placeBelow(picker, anchor);
	const input = picker.querySelector("input"), box = picker.querySelector(".opts");
	const draw = () => {
		const query = input.value.toLowerCase();
		const matches = item => (item.label + " " + item.id).toLowerCase().includes(query);
		let html = groups.map(group => {
			const hits = group.items.filter(matches).slice(0, limit);
			return hits.length ? (group.title ? `<div class="grp">${escapeHtml(group.title)}</div>` : "") + hits.map(optionHtml).join("") : "";
		}).join("");
		const offersCreate = createLabel && (query || createAlways);
		if (!html && !offersCreate) html = `<div class="empty">Nothing to add</div>`;
		if (offersCreate) html += `<div class="opt create" data-create="1">${icon("plus", 14)}${escapeHtml(createLabel)}${query ? ` “${escapeHtml(input.value)}”` : ""}</div>`;
		box.innerHTML = html;
		refreshIcons();
	};
	box.addEventListener("click", event => {
		const option = event.target.closest(".opt");
		if (!option) return;
		const value = input.value.trim();
		closePopover();
		if (option.dataset.create) onCreate(value);
		else onPick(option.dataset.v);
	});
	input.addEventListener("input", draw);
	input.addEventListener("keydown", event => { if (event.key === "Enter") box.querySelector(".opt")?.click(); });
	draw();
	input.focus();
}

/**
 * Opens a searchable checklist below an anchor. `getGroups(query)` returns `[{ title, items }]` where
 * items are `{ id, label, icon, owner, on }`; `onToggle(id)` flips one and the list redraws.
 */
export function openChecklist(anchor, { placeholder, getGroups, onToggle, emptyText = "Nothing to show" }) {
	const list = mountPopover("pop", `<input placeholder="${escapeHtml(placeholder)}"><div class="opts" style="max-height:360px;overflow:auto"></div>`);
	const input = list.querySelector("input"), box = list.querySelector(".opts");
	const draw = () => {
		box.innerHTML = getGroups(input.value.toLowerCase()).filter(group => group.items.length).map(group =>
			`<div class="grp">${escapeHtml(group.title)}</div>` + group.items.map(item => `<div class="opt" data-v="${escapeHtml(item.id)}">
				<span class="cb ${item.on ? "on" : ""}">${icon("check", 12)}</span>${icon(item.icon, 14)}${pill(item.id)}<span>${escapeHtml(item.label)}</span>
				${item.owner ? `<span class="owner">${escapeHtml(item.owner)}</span>` : ""}</div>`).join("")).join("") || `<div class="empty">${escapeHtml(emptyText)}</div>`;
		refreshIcons();
	};
	draw();
	placeBelow(list, anchor);
	box.addEventListener("click", event => {
		const id = event.target.closest(".opt")?.dataset.v;
		if (!id) return;
		onToggle(id);
		draw();
	});
	input.addEventListener("input", draw);
	input.focus();
}

/**
 * Opens a modal dialog. `actions` are `{ label, variant, run }` (variant "danger" or "primary");
 * a Cancel button (labelled `cancelLabel`) is always added. Enter runs the last action, Escape cancels.
 */
export function openDialog({ icon: iconName = "triangle-alert", title, intro = "", items = [], actions, cancelLabel = "Cancel" }) {
	closePopover();
	const overlay = document.createElement("div");
	overlay.className = "overlay";
	overlay.innerHTML = `<div class="dialog"><h3>${icon(iconName, 18)}${escapeHtml(title)}</h3>
		${intro ? `<p>${escapeHtml(intro)}</p>` : ""}
		${items.length ? `<ul>${items.map(line => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : ""}
		<div class="actions"><button type="button" class="btn" data-a="cancel">${escapeHtml(cancelLabel)}</button>
		${actions.map((action, i) => `<button type="button" class="btn ${action.variant ?? ""}" data-a="${i}">${escapeHtml(action.label)}</button>`).join("")}</div></div>`;
	document.body.appendChild(overlay);
	refreshIcons();
	const close = () => { overlay.remove(); removeEventListener("keydown", onKey, true); };
	const run = action => { close(); action.run(); };
	const onKey = event => {
		event.stopPropagation();
		if (event.key === "Escape") close();
		if (event.key === "Enter") { event.preventDefault(); actions.length ? run(actions.at(-1)) : close(); }
	};
	addEventListener("keydown", onKey, true);
	overlay.addEventListener("click", event => {
		const choice = event.target.closest("[data-a]")?.dataset.a;
		if (choice === "cancel" || event.target === overlay) close();
		else if (choice !== undefined) run(actions[Number(choice)]);
	});
	overlay.querySelector(`[data-a="${actions.length ? actions.length - 1 : "cancel"}"]`).focus();
}

/** Asks to confirm a deletion, listing its side effects. */
export const confirmDelete = (title, effects, onConfirm) =>
	openDialog({ icon: "trash-2", title, intro: effects.length ? "This will also:" : "", items: effects, actions: [{ label: "Delete", variant: "danger", run: onConfirm }] });
