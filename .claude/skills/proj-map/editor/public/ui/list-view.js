import { escapeHtml as escape, pluralize } from "../lib/format.js";
import {
	ITEM_KINDS, SPEC_KINDS, addToOptionalList, attachToComponent, canAddParent, createActor, createComponent, createFolder, createRelation,
	createSpec, createTest, deleteComponent, deleteFolder, deleteItem, deleteRelation, deleteSpec, detachResource, flipRelation,
	getComponentDeletionImpact, getComponentSlot, getFolderDeletionImpact, getFolderPath, getHolders, getItemKind, getKind,
	getReferrers, getRelationKinds, getSpecDeletionImpact, getSpecOwner, isFolderInside, isUntouchedRelation, moveComponentBefore,
	removeFromOptionalList, removeItem, toggleReliesOn,
} from "../lib/model.js";
import { formatRoute } from "../lib/route.js";
import { addBranch, appendStep, getStep, insertStepAfter, removeStep } from "../lib/steps.js";
import {
	closePopover, confirmDelete, icon, inlineEdit, isPopoverOpen, isTyping, openChecklist, openMenu, openMenuAt, openPicker,
	pill, refreshIcons, selectAllText,
} from "./dom.js";
import { createListMarkup, isRequiredField } from "./list-markup.js";

const SIDEBAR_WIDTH_KEY = "projMap.editor.sidebarWidth";
const SIDEBAR_MIN = 260, SIDEBAR_MAX = 760;

/**
 * The List tab: a folder tree of components on the left, and on the right the page of the selected
 * item (any kind). Mutates `doc.map` and calls `onChange` after every edit.
 */
export function createListView({ doc, onChange }) {
	const tree = document.getElementById("tree");
	const sidebar = document.getElementById("sidebar");
	const detail = document.getElementById("detail");
	const root = document.getElementById("viewList");

	const openFolders = new Set(doc.map.folders.map(f => f.id));
	const state = {
		selectedId: null, openCard: null, editList: null, filters: {}, showRelated: true,
		sections: { details: true, specs: true, resources: true },
	};
	const markup = createListMarkup({ doc, state });
	let pendingRender = false, drag = null;

	const isActive = () => !root.hidden;
	const selected = () => doc.index[state.selectedId];

	/* ================= sidebar ================= */

	/** Renders the folder tree with the components in it. */
	function renderTree() {
		doc.reindex();
		document.getElementById("compCount").textContent = doc.map.components.length;
		const rows = [];
		const walk = (folderId, depth) => {
			for (const folder of doc.map.folders.filter(f => (f.parent ?? null) === folderId)) {
				const open = openFolders.has(folder.id);
				const count = doc.map.components.filter(c => c.folder === folder.id).length;
				rows.push(`<div class="item folder ${open ? "open" : ""} ${folder.id === state.selectedId ? "selected" : ""}" draggable="true" data-kind="folder" data-id="${folder.id}">
					<span style="width:${depth * 18}px;flex:none"></span>
					<span class="chev">${icon("chevron-right", 14)}</span>
					<span class="ic">${icon(open ? "folder-open" : "folder")}</span>
					<span class="name">${escape(folder.label)}</span><span class="fill"></span>
					<span class="depth">${count || ""}</span></div>`);
				if (open) walk(folder.id, depth + 1);
			}
			for (const component of doc.map.components.filter(c => (c.folder ?? null) === folderId || (folderId === null && c.folder && !doc.index[c.folder]))) {
				const source = component.sourceLocation?.[0];
				rows.push(`<div class="item comp ${component.id === state.selectedId || component.id === getPageOwner() ? "selected" : ""}" draggable="true" data-kind="comp" data-id="${component.id}">
					<span style="width:${depth * 18 + 20}px;flex:none"></span>
					<span class="name">${escape(component.label) || `<span class="muted">Untitled</span>`}</span>
					${source ? `<span class="src" title="${escape(source)}">${escape(source)}</span>` : `<span class="fill"></span>`}
					<span class="depth">${escape(component.depth)}</span>${pill(component.id)}</div>`);
			}
		};
		walk(null, 0);
		tree.innerHTML = rows.join("") || `<div class="none" style="padding:8px">No components yet.</div>`;
		refreshIcons();
		onChange();
	}

	/** Component the shown spec page belongs to, so the tree can highlight it. */
	const getPageOwner = () => {
		const kind = getItemKind(state.selectedId);
		return SPEC_KINDS.includes(kind) ? getSpecOwner(doc.map, state.selectedId)?.id : null;
	};

	/** Renames a folder in place in the tree. */
	function renameFolder(id) {
		const name = tree.querySelector(`.item[data-id="${id}"] .name`);
		if (!name) return;
		inlineEdit(name, value => { if (value) doc.index[id].label = value; renderAll(); }, renderTree);
	}

	/** Creates a component (in a folder, when given) and starts editing its name. */
	function newComponent(folderId) {
		const component = createComponent(doc.map, folderId);
		if (folderId) openFolders.add(folderId);
		select(component.id);
		startEditing(detail.querySelector('[data-field="label"]'));
	}

	/** Creates a folder (nested in another, when given) and starts editing its name. */
	function newFolder(parentId) {
		const folder = createFolder(doc.map, parentId);
		if (parentId) openFolders.add(parentId);
		openFolders.add(folder.id);
		renderTree();
		renameFolder(folder.id);
		selectAllText(tree.querySelector(`.item[data-id="${folder.id}"] .name`));
	}

	/** Removes the drop indicators from the tree. */
	function clearDropMarks() {
		tree.querySelectorAll(".drop-into,.drop-before").forEach(n => n.classList.remove("drop-into", "drop-before"));
		tree.classList.remove("drop-root");
	}

	tree.addEventListener("click", event => {
		const item = event.target.closest(".item");
		if (!item || event.target.closest("[contenteditable]")) return;
		if (item.dataset.kind === "folder") {
			if (!openFolders.delete(item.dataset.id)) openFolders.add(item.dataset.id);
			renderTree();
		} else select(item.dataset.id);
	});
	tree.addEventListener("dblclick", event => {
		const item = event.target.closest(".item.folder");
		if (item) renameFolder(item.dataset.id);
	});
	tree.addEventListener("contextmenu", event => {
		const item = event.target.closest(".item");
		if (!item) return;
		event.preventDefault();
		const id = item.dataset.id;
		if (item.dataset.kind === "folder") openMenu(event.clientX, event.clientY, [
			{ icon: "pencil", label: "Rename", run: () => renameFolder(id) },
			{ icon: "file-text", label: "Open folder page", run: () => openItem(id) },
			{ icon: "folder-plus", label: "New subfolder", run: () => newFolder(id) },
			{ icon: "plus", label: "New component here", run: () => newComponent(id) },
			"-",
			{ icon: "trash-2", label: "Delete folder", danger: true, run: () => askDeleteFolder(id) },
		]);
		else openMenu(event.clientX, event.clientY, [{ icon: "trash-2", label: "Delete component", danger: true, run: () => askDeleteComponent(id) }]);
	});

	/* drag & drop: onto a folder = move into it; onto a component = place before it; onto empty space = top level */
	tree.addEventListener("dragstart", event => {
		const item = event.target.closest(".item");
		if (!item) return;
		drag = { kind: item.dataset.kind, id: item.dataset.id };
		event.dataTransfer.effectAllowed = "move";
		requestAnimationFrame(() => item.classList.add("dragging"));
	});
	tree.addEventListener("dragend", () => { drag = null; clearDropMarks(); renderTree(); });
	tree.addEventListener("dragover", event => {
		if (!drag) return;
		event.preventDefault();
		clearDropMarks();
		const item = event.target.closest(".item");
		if (!item) return tree.classList.add("drop-root");
		if (item.dataset.id === drag.id) return;
		if (item.dataset.kind === "folder" && !(drag.kind === "folder" && isFolderInside(doc.index, item.dataset.id, drag.id))) item.classList.add("drop-into");
		else if (item.dataset.kind === "comp" && drag.kind === "comp") item.classList.add("drop-before");
	});
	tree.addEventListener("drop", event => {
		event.preventDefault();
		if (!drag) return;
		const item = event.target.closest(".item");
		const moving = doc.index[drag.id];
		const key = drag.kind === "comp" ? "folder" : "parent";
		if (!item) delete moving[key];
		else if (item.classList.contains("drop-into")) {
			moving[key] = item.dataset.id;
			openFolders.add(item.dataset.id);
		} else if (item.classList.contains("drop-before")) moveComponentBefore(doc.map, moving, doc.index[item.dataset.id]);
		clearDropMarks();
		renderAll();
	});

	document.getElementById("newComp").addEventListener("click", () => newComponent(selected()?.folder));
	document.getElementById("newFolder").addEventListener("click", () => newFolder());

	try { const width = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)); if (width) sidebar.style.width = width + "px"; } catch {}
	document.getElementById("resizer").addEventListener("pointerdown", event => {
		const startX = event.clientX, startWidth = sidebar.offsetWidth;
		document.body.classList.add("resizing");
		const move = moveEvent => { sidebar.style.width = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidth + moveEvent.clientX - startX)) + "px"; };
		const up = () => {
			document.body.classList.remove("resizing");
			removeEventListener("pointermove", move);
			removeEventListener("pointerup", up);
			try { localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebar.offsetWidth); } catch {}
		};
		addEventListener("pointermove", move);
		addEventListener("pointerup", up);
	});

	/* ================= pages ================= */

	/** Shows an item's page (any kind), optionally with one of its cards open. */
	function select(id, card = null) {
		state.selectedId = id;
		state.openCard = card;
		state.editList = null;
		state.filters = {};
		history.replaceState(null, "", formatRoute({ view: "list", id }));
		renderTree();
		renderDetail();
	}

	/** Opens an item's page through the address bar, so Back returns here. */
	const openItem = id => { location.hash = formatRoute({ view: "list", id }); };

	/** Renders the selected item's page. */
	function renderDetail() {
		pendingRender = false;
		doc.reindex();
		const item = selected();
		if (!item) {
			detail.innerHTML = `<div class="detail-inner none">${doc.map.components.length ? "Nothing selected." : "No components yet. Add one with the + button."}</div>`;
			return onChange();
		}
		const page = getItemKind(item.id)?.key === "components" ? markup.componentPage(item) : markup.itemPage(item);
		detail.innerHTML = `<div class="detail-inner">${page}</div>`;
		refreshIcons();
		onChange();
	}

	/** Re-renders the tree and the page. */
	function renderAll() {
		renderTree();
		renderDetail();
	}

	/** Clicks a field to edit it and selects its text. */
	function startEditing(element) {
		if (!element) return;
		element.scrollIntoView({ block: "nearest" });
		element.click();
		selectAllText(element);
	}

	/* ---------- links between components ---------- */

	/** Picker option for a component. */
	const componentOption = c => ({ id: c.id, label: c.label, owner: c.depth });

	/** Opens the picker that adds a parent, subcomponent or dependency. */
	function addLink(anchor, field) {
		const component = selected();
		if (field === "parents") {
			return openPicker(anchor, { placeholder: "Add a parent component…", limit: 8, options: doc.map.components.filter(o => canAddParent(doc.index, component.id, o.id)).map(componentOption),
				onPick: id => { addToOptionalList(component, "partOf", id); renderDetail(); } });
		}
		if (field === "children") {
			return openPicker(anchor, { placeholder: "Add a subcomponent…", limit: 8, options: doc.map.components.filter(o => canAddParent(doc.index, o.id, component.id)).map(componentOption),
				onPick: id => { addToOptionalList(doc.index[id], "partOf", component.id); renderDetail(); } });
		}
		const outgoing = field === "dependsOn";
		openPicker(anchor, { placeholder: outgoing ? "Depends on…" : "Used by…", limit: 8, options: doc.map.components.filter(o => o.id !== component.id).map(componentOption),
			onPick: id => { outgoing ? createRelation(doc.map, component.id, id) : createRelation(doc.map, id, component.id); renderDetail(); } });
	}

	/** Removes a parent, a subcomponent, or (after confirming, unless untouched) a relation. */
	function unlink(field, id) {
		const component = selected();
		if (field === "parents") removeFromOptionalList(component, "partOf", id);
		else if (field === "children") removeFromOptionalList(doc.index[id], "partOf", component.id);
		else return askDeleteRelation(doc.index[id]);
		renderDetail();
	}

	/** Checklist of the specs a relation relies on: the target's first, then the source's, then everyone else's. */
	function openReliesChecklist(anchor, relation) {
		const specItems = (owner, query, showOwner) => SPEC_KINDS.flatMap(kind => (owner.specs?.[kind.key] ?? []).filter(id => doc.index[id]).map(id => ({
			id, label: doc.index[id].label, icon: kind.icon, owner: showOwner ? owner.label : "", on: !!relation.reliesOn?.includes(id),
		}))).filter(item => (item.label + " " + item.id).toLowerCase().includes(query));
		const target = doc.index[relation.to], source = doc.index[relation.from];
		openChecklist(anchor, {
			placeholder: "Search specs…",
			emptyText: "No specs",
			getGroups: query => [
				{ title: `${target.label} (to)`, items: specItems(target, query, false) },
				{ title: `${source.label} (from)`, items: specItems(source, query, false) },
				{ title: "Other components · check for a missing edge", items: doc.map.components.filter(o => o !== target && o !== source).flatMap(o => specItems(o, query, true)) },
			],
			onToggle: id => {
				toggleReliesOn(relation, id);
				const counter = detail.querySelector(`.lrely[data-relies="${relation.id}"]`);
				if (counter) counter.textContent = `relies on ${relation.reliesOn?.length ?? 0}`;
				else pendingRender = true;
				onChange();
			},
		});
	}

	/** Menu to change a relation's kind, including a custom one. */
	function openRelationKindMenu(anchor, relation) {
		openMenuAt(anchor, [
			...getRelationKinds(doc.map).map(kind => ({ label: kind, on: relation.kind === kind, run: () => { relation.kind = kind; renderDetail(); } })),
			"-",
			{ icon: "pencil", label: "Custom kind…", run: () => inlineEdit(anchor, value => { if (value) relation.kind = value; renderDetail(); }, renderDetail) },
		]);
	}

	/* ---------- specs ---------- */

	/** Card menu: inherited cards link to their owner; own ones can be deleted (resources also detached). */
	function openCardMenu(anchor, kindKey, id, fromId) {
		const kind = getKind(kindKey), component = selected();
		if (fromId) return openMenuAt(anchor, [
			{ icon: "file-text", label: `Open ${kind.one} page`, run: () => openItem(id) },
			{ icon: "arrow-up-right", label: `Go to ${doc.index[fromId].label}`, run: () => select(fromId) },
		]);
		openMenuAt(anchor, [
			{ icon: "file-text", label: `Open ${kind.one} page`, run: () => openItem(id) },
			...(kind.reusable ? [{ icon: "unlink", label: `Remove from ${component.label || component.id}`, run: () => { detachResource(component, id); renderDetail(); } }] : []),
			"-",
			{ icon: "trash-2", label: `Delete ${kind.one}`, danger: true, run: () => askDeleteSpec(kind, id) },
		]);
	}

	/** Specs are always created new on the component; resources can also be picked among existing ones. */
	function openSpecPicker(anchor, kind) {
		const component = selected();
		if (!kind.reusable) return addSpec(component, kind);
		const attached = new Set(getComponentSlot(component, kind));
		openPicker(anchor, {
			placeholder: `Search ${kind.title.toLowerCase()}…`,
			limit: 8,
			options: doc.map[kind.key].filter(x => !attached.has(x.id)).map(x => ({ id: x.id, label: x.label, owner: getHolders(doc.map, x.id).map(o => o.label).join(", ") || "unused" })),
			onPick: id => { attachToComponent(component, kind, id); renderDetail(); },
			createLabel: `New ${kind.one}`, createAlways: true,
			onCreate: label => addSpec(component, kind, label),
		});
	}

	/** Creates a spec on a component, opens its card and starts editing its label. */
	function addSpec(component, kind, label) {
		const spec = createSpec(doc.map, component, kind, label);
		state.sections[kind.key === "resources" ? "resources" : "specs"] = true;
		state.filters = {};
		state.openCard = spec.id;
		renderDetail();
		startEditing(detail.querySelector(`[data-card="${spec.id}"] [data-field="label"]`));
	}

	/** Picker that adds an existing test or spec to what verifies a spec, or creates a new test. */
	function openVerifierPicker(anchor, spec) {
		const candidate = item => item.id !== spec.id && !spec.verifiedBy?.includes(item.id);
		const add = id => { (spec.verifiedBy ??= []).push(id); renderDetail(); };
		openPicker(anchor, {
			placeholder: "Search tests and specs…",
			groups: [
				{ title: "Tests", items: doc.map.tests.filter(candidate).map(t => ({ id: t.id, label: t.label, icon: "flask-conical", owner: t.type })) },
				...SPEC_KINDS.map(kind => ({ title: kind.title, items: doc.map[kind.key].filter(candidate).map(x => ({ id: x.id, label: x.label, icon: kind.icon })) })),
			],
			onPick: add,
			createLabel: "New test", createAlways: true,
			onCreate: label => add(createTest(doc.map, label).id),
		});
	}

	/** Picker that adds an existing actor to a use case, or creates a new one. */
	function openActorPicker(anchor, useCase) {
		const add = id => { addToOptionalList(useCase, "actors", id); renderDetail(); };
		openPicker(anchor, {
			placeholder: "Search actors…",
			options: doc.map.actors.filter(a => !useCase.actors?.includes(a.id)).map(a => ({ id: a.id, label: a.label, icon: "user" })),
			onPick: add,
			createLabel: "New actor", createAlways: true,
			onCreate: label => add(createActor(doc.map, label).id),
		});
	}

	/** Picker of specs a test can verify. */
	function openVerifiesPicker(anchor, test) {
		openPicker(anchor, {
			placeholder: "Search specs…",
			groups: SPEC_KINDS.map(kind => ({ title: kind.title, items: doc.map[kind.key].filter(x => !x.verifiedBy?.includes(test.id)).map(x => ({ id: x.id, label: x.label, icon: kind.icon, owner: getSpecOwner(doc.map, x.id)?.label })) })),
			onPick: id => { (doc.index[id].verifiedBy ??= []).push(test.id); renderDetail(); },
		});
	}

	/** Picker of use cases an actor can take part in. */
	function openUseCasePicker(anchor, actor) {
		openPicker(anchor, {
			placeholder: "Search use cases…",
			options: doc.map.useCases.filter(u => !u.actors?.includes(actor.id)).map(u => ({ id: u.id, label: u.label, icon: "route", owner: getSpecOwner(doc.map, u.id)?.label })),
			onPick: id => { addToOptionalList(doc.index[id], "actors", actor.id); renderDetail(); },
		});
	}

	/** Picker of any item a decision can reference. */
	function openReferencePicker(anchor, decision) {
		openPicker(anchor, {
			placeholder: "Search items…",
			limit: 6,
			groups: ITEM_KINDS.filter(kind => kind.key !== "folders").map(kind => ({ title: kind.title, items: doc.map[kind.key].filter(x => x.id !== decision.id && !decision.references?.includes(x.id)).map(x => ({ id: x.id, label: x.label, icon: kind.icon })) })),
			onPick: id => { (decision.references ??= []).push(id); renderDetail(); },
		});
	}

	/** Opens the chip picker for a string list, suggesting values used by other items of the same kind. */
	function openStringPicker(anchor, obj, field) {
		const push = value => { if (value) addToOptionalList(obj, field, value); renderDetail(); };
		const kind = getItemKind(obj.id);
		const suggestions = [...new Set(doc.map[kind.key].flatMap(o => o[field] ?? []))].filter(v => !obj[field]?.includes(v));
		const placeholder = { technologies: "Technology…", sourceLocation: "Path or URL…", prerequisites: "Condition that must hold first…" }[field] ?? "Value…";
		openPicker(anchor, { placeholder, limit: 8, options: suggestions.map(v => ({ id: v, label: v })), onPick: push, createLabel: "Add", onCreate: push });
	}

	/** Picks a relation end or a folder parent. */
	function openItemPick(anchor, pick) {
		const item = selected();
		if (pick === "level") return openMenuAt(anchor, ["high-level", "low-level"].map(level => ({ label: level, on: item.level === level, run: () => { item.level = level; renderDetail(); } })));
		if (pick === "folder") return openMenuAt(anchor, [
			{ label: "No folder", on: !item.folder, run: () => { delete item.folder; renderAll(); } }, "-",
			...doc.map.folders.map(f => ({ icon: "folder", label: getFolderPath(doc.index, f.id), on: item.folder === f.id, run: () => { item.folder = f.id; openFolders.add(f.id); renderAll(); } })),
		]);
		if (pick === "parent") return openMenuAt(anchor, [
			{ label: "Top level", on: !item.parent, run: () => { delete item.parent; renderAll(); } }, "-",
			...doc.map.folders.filter(f => !isFolderInside(doc.index, f.id, item.id)).map(f => ({ icon: "folder", label: getFolderPath(doc.index, f.id), on: item.parent === f.id, run: () => { item.parent = f.id; renderAll(); } })),
		]);
		const other = pick === "from" ? item.to : item.from;
		openPicker(anchor, { placeholder: "Search components…", options: doc.map.components.filter(c => c.id !== other).map(componentOption), onPick: id => { item[pick] = id; renderDetail(); } });
	}

	/* ---------- editing ---------- */

	/** Edits a notes box: raw Markdown while editing, rendered once done. */
	function editNotes(element) {
		const obj = doc.index[element.dataset.notes];
		element.classList.add("editing");
		element.classList.remove("empty");
		element.textContent = obj.notes ?? "";
		inlineEdit(element, value => { if (value) obj.notes = value; else delete obj.notes; renderDetail(); }, renderDetail, { multiline: true });
	}

	/** Edits a text field. Required fields stay (empty), optional ones are dropped when cleared. */
	function editField(element) {
		const obj = doc.index[element.dataset.obj], field = element.dataset.field;
		inlineEdit(element, value => {
			if (!value && field === "label" && obj.label) { element.innerText = obj.label; return; }
			if (value || isRequiredField(obj, field)) obj[field] = value;
			else delete obj[field];
			if (["label", "depth", "category", "type", "location"].includes(field)) renderAll();
			else onChange();
		});
	}

	/** Edits a part of an interface's protocol; the protocol goes away once it's empty. */
	function editProtocol(element) {
		const spec = doc.index[element.dataset.obj], part = element.dataset.protocol;
		inlineEdit(element, value => {
			const protocol = { name: spec.protocol?.name ?? "", additionalSpecs: spec.protocol?.additionalSpecs, [part]: value };
			if (!protocol.additionalSpecs) delete protocol.additionalSpecs;
			if (protocol.name || protocol.additionalSpecs) spec.protocol = protocol;
			else delete spec.protocol;
			renderDetail();
		});
	}

	/** Edits a step's action; a step left empty goes away. */
	function editStep(element) {
		const [useCaseId, path] = element.dataset.step.split("|");
		const useCase = doc.index[useCaseId];
		inlineEdit(element, value => {
			if (value) getStep(useCase.steps, path).action = value;
			else removeStep(useCase.steps, path);
			renderDetail();
		}, () => { if (!getStep(useCase.steps, path).action) { removeStep(useCase.steps, path); renderDetail(); } });
	}

	/** Adds a step (after one, as a branch of one, or at the end) and starts editing it. */
	function addStep(useCaseId, path, how) {
		const useCase = doc.index[useCaseId];
		useCase.steps ??= [];
		const created = how === "branch" ? addBranch(useCase.steps, path) : how === "next" ? insertStepAfter(useCase.steps, path) : appendStep(useCase.steps);
		renderDetail();
		detail.querySelector(`[data-step="${useCaseId}|${created}"]`)?.click();
	}

	/** Handles every click on the page. */
	function onDetailClick(event) {
		if (event.target.closest(".notes a, .preview")) return;
		const target = event.target.closest("[data-act],[data-sectoggle],[data-notes],[data-field],[data-protocol],[data-step],[data-stepnext],[data-stepbranch],[data-stepdel],[data-stepadd],[data-pick],[data-goto],[data-filter],[data-addlink],[data-unlink],[data-relkind],[data-relies],[data-unrely],[data-rm],[data-add],[data-verify],[data-unverify],[data-addactor],[data-unactor],[data-addverifies],[data-unverifies],[data-addusecase],[data-unusecase],[data-addref],[data-unref],[data-list],[data-addspec],[data-cardmenu],[data-card]");
		if (!target || target.isContentEditable) return;
		const item = selected(), data = target.dataset;
		const parts = name => data[name].split("|");
		if (data.field) return editField(target);
		if (data.protocol) return editProtocol(target);
		if (data.step) return editStep(target);
		if (data.stepnext) return addStep(...parts("stepnext"), "next");
		if (data.stepbranch) return addStep(...parts("stepbranch"), "branch");
		if (data.stepadd) return addStep(data.stepadd, null, "end");
		if (data.stepdel) { const [useCaseId, path] = parts("stepdel"); removeStep(doc.index[useCaseId].steps, path); return renderDetail(); }
		if (data.notes) return editNotes(target);
		if (data.sectoggle) { state.sections[data.sectoggle] = !state.sections[data.sectoggle]; return renderDetail(); }
		if (data.act === "delete") return askDelete(item.id);
		if (data.act === "related") { state.showRelated = !state.showRelated; delete state.filters.source; return renderDetail(); }
		if (data.act === "flip") { flipRelation(item); return renderDetail(); }
		if (data.addlink) return addLink(target, data.addlink);
		if (data.unlink) return unlink(...parts("unlink"));
		if (data.relkind) return openRelationKindMenu(target, doc.index[data.relkind]);
		if (data.relies) return openReliesChecklist(target, doc.index[data.relies]);
		if (data.unrely) { const [relationId, specId] = parts("unrely"); removeFromOptionalList(doc.index[relationId], "reliesOn", specId); return renderDetail(); }
		if (data.filter) {
			const set = (state.filters[data.filter] ??= new Set());
			if (!set.delete(data.value)) set.add(data.value);
			return renderDetail();
		}
		if (data.pick) return openItemPick(target, data.pick);
		if (data.rm) { const [objId, field, i] = parts("rm"), obj = doc.index[objId]; obj[field].splice(Number(i), 1); if (!obj[field].length) delete obj[field]; return renderDetail(); }
		if (data.add) { const [objId, field] = parts("add"); return openStringPicker(target, doc.index[objId], field); }
		if (data.verify) return openVerifierPicker(target, doc.index[data.verify]);
		if (data.unverify) { const [specId, i] = parts("unverify"); doc.index[specId].verifiedBy.splice(Number(i), 1); return renderDetail(); }
		if (data.addactor) return openActorPicker(target, doc.index[data.addactor]);
		if (data.unactor) { const [useCaseId, i] = parts("unactor"); doc.index[useCaseId].actors.splice(Number(i), 1); return renderDetail(); }
		if (data.addverifies) return openVerifiesPicker(target, doc.index[data.addverifies]);
		if (data.unverifies) { const [testId, specId] = parts("unverifies"); removeItem(doc.index[specId].verifiedBy, testId); return renderDetail(); }
		if (data.addusecase) return openUseCasePicker(target, doc.index[data.addusecase]);
		if (data.unusecase) { const [actorId, useCaseId] = parts("unusecase"); removeItem(doc.index[useCaseId].actors, actorId); return renderDetail(); }
		if (data.addref) return openReferencePicker(target, doc.index[data.addref]);
		if (data.unref) { const [decisionId, i] = parts("unref"); doc.index[decisionId].references.splice(Number(i), 1); return renderDetail(); }
		if (data.goto && state.editList !== target.closest("[data-list]")?.dataset.list) return doc.index[data.goto] && select(data.goto);
		if (data.list) { if (state.editList !== data.list) { state.editList = data.list; renderDetail(); } return; }
		if (data.addspec) return openSpecPicker(target, getKind(data.addspec));
		if (data.cardmenu) { event.stopPropagation(); return openCardMenu(target, ...parts("cardmenu")); }
		if (data.card) { state.openCard = state.openCard === data.card ? null : data.card; return renderDetail(); }
	}
	detail.addEventListener("click", onDetailClick);

	// leaving a list field ends its edit state (capture phase, so a click on another list still lands after the re-render)
	document.addEventListener("click", event => {
		if (!isActive() || event.target.closest(".pop, .overlay")) return;
		if (!pendingRender && (!state.editList || event.target.closest(`[data-list="${state.editList}"]`))) return;
		if (state.editList && !event.target.closest(`[data-list="${state.editList}"]`)) state.editList = null;
		pendingRender = true;
		queueMicrotask(() => { if (pendingRender) renderDetail(); });
	}, true);

	/* ---------- deletion ---------- */

	/** Asks to delete any item, with the side effects that fit its kind. */
	function askDelete(id) {
		const kind = getItemKind(id);
		if (kind.key === "components") return askDeleteComponent(id);
		if (kind.key === "folders") return askDeleteFolder(id);
		if (kind.key === "relations") return askDeleteRelation(doc.index[id]);
		if (getKind(kind.key)) return askDeleteSpec(kind, id);
		confirmDelete(`Delete ${kind.one} ${id}?`, getReferrers(doc.map, id).map(ref => `Removed from ${ref.field} of ${ref.owner}`),
			() => { deleteItem(doc.map, id); leavePage(); });
	}

	/** After deleting the shown item, goes to its owner component or the first one. */
	function leavePage(ownerId) {
		doc.reindex();
		select(doc.index[ownerId] ? ownerId : doc.map.components[0]?.id ?? null);
	}

	/** Confirms and deletes a relation; untouched ones go without asking. */
	function askDeleteRelation(relation) {
		const drop = () => {
			deleteRelation(doc.map, relation.id);
			if (state.selectedId === relation.id) leavePage(relation.from);
			else renderDetail();
		};
		if (isUntouchedRelation(relation)) return drop();
		confirmDelete(`Delete relation ${relation.id}?`, [
			`“${relation.label}”: ${doc.index[relation.from]?.label} ${relation.kind} ${doc.index[relation.to]?.label}`,
			...(relation.reliesOn?.length ? [`It relies on ${relation.reliesOn.join(", ")}; those specs stay on their components`] : []),
		], drop);
	}

	/** Confirms and deletes a component, then selects its neighbour in the tree. */
	function askDeleteComponent(id) {
		const component = doc.index[id];
		const { relations, children, decisions, specCount } = getComponentDeletionImpact(doc.map, id);
		const label = otherId => doc.index[otherId]?.label ?? otherId;
		confirmDelete(`Delete ${component.label || id}?`, [
			...relations.map(r => `Relation ${r.id} (${label(r.from)} ${r.kind} ${label(r.to)}) will be deleted`),
			...children.map(o => `${o.label} will no longer be part of it`),
			...decisions.map(d => `Removed from the references of ${d.id}`),
			...(specCount ? [`Its ${pluralize(specCount, "spec")} stay in the map, unassigned`] : []),
		], () => {
			const order = [...tree.querySelectorAll(".item.comp")].map(n => n.dataset.id);
			const at = order.indexOf(id);
			deleteComponent(doc.map, id);
			doc.reindex();
			select(order[at + 1] ?? order[at - 1] ?? doc.map.components[0]?.id ?? null);
		});
	}

	/** Confirms and deletes a folder; its content moves one level up. */
	function askDeleteFolder(id) {
		const folder = doc.index[id];
		const { components, subfolders } = getFolderDeletionImpact(doc.map, id);
		const destination = folder.parent ? doc.index[folder.parent].label : "the top level";
		confirmDelete(`Delete folder ${folder.label}?`, [
			...(components.length ? [`${pluralize(components.length, "component")} move to ${destination}`] : []),
			...(subfolders.length ? [`${pluralize(subfolders.length, "subfolder")} move to ${destination}`] : []),
			"No component is deleted",
		], () => {
			deleteFolder(doc.map, id);
			if (state.selectedId === id) leavePage();
			else renderAll();
		});
	}

	/** Confirms and deletes a spec or resource with every reference to it. */
	function askDeleteSpec(kind, id) {
		const spec = doc.index[id];
		const owner = getSpecOwner(doc.map, id)?.id;
		const { holders, otherHolders, relations, verified, decisions } = getSpecDeletionImpact(doc.map, id);
		confirmDelete(`Delete ${kind.one} ${id}?`, [
			...(kind.reusable ? [`“${spec.label}” is removed from the whole map`, ...holders.map(o => `Removed from ${o.label}`), ...otherHolders.map(o => `Removed from the resources of ${o.id}`)] : []),
			...relations.map(r => `Removed from what ${r.id} relies on`),
			...verified.map(s => `Removed from the verifiers of ${s.id}`),
			...decisions.map(d => `Removed from the references of ${d.id}`),
		], () => {
			deleteSpec(doc.map, kind, id);
			if (state.selectedId === id) leavePage(owner);
			else renderDetail();
		});
	}

	addEventListener("keydown", event => {
		if (!isActive() || event.key !== "Delete" || isTyping() || isPopoverOpen() || document.querySelector(".overlay")) return;
		if (selected()) askDelete(state.selectedId);
	});

	return {
		/** Shows the tab, optionally on an item and one of its cards. */
		show({ id, card } = {}) {
			closePopover();
			const target = doc.index[id] ? id : doc.index[state.selectedId] ? state.selectedId : doc.map.components[0]?.id ?? null;
			select(target, card);
			if (card) detail.querySelector(`[data-card="${card}"]`)?.scrollIntoView({ block: "center" });
		},
		/** Re-renders after the map was replaced, keeping the page when its item still exists. */
		reset() {
			if (!doc.index[state.selectedId]) state.selectedId = doc.map.components[0]?.id ?? null;
			state.editList = null;
			if (isActive()) renderAll();
		},
	};
}

