import { escapeHtml as esc, getResourceUrl, isImageLocation, pluralize, titleCase } from "../lib/format.js";
import {
	RESOURCE_KIND, SPEC_KINDS, getChildren, getFolderPath, getHolders, getItemKind, getSpecCards, getSpecOwner,
} from "../lib/model.js";
import { countSteps, getStepRows } from "../lib/steps.js";
import { icon, pill, renderMarkdown } from "./dom.js";

const VERIFIED_FACET = { name: "verified", of: x => [x.verifiedBy?.length ? "Verified" : "Unverified"], order: ["Verified", "Unverified"] };

/** Whether a field must stay in the item (as an empty string) when cleared. */
export function isRequiredField(obj, field) {
	const kind = getItemKind(obj.id)?.key;
	if (field === "label") return true;
	if (field === "summary") return kind !== "folders";
	if (field === "depth") return kind === "components";
	if (field === "type" || field === "location") return kind === "resources" || kind === "tests";
	return false;
}

/**
 * HTML builders for the List tab: the component page, the page of every other kind of item, and spec
 * cards. They read the view's `state` (selection, open card, list in edit, filters, sections).
 */
export function createListMarkup({ doc, state }) {
	const facetsByKind = {
		requirements: [{ name: "category", of: x => [x.category || "Uncategorized"], first: "Uncategorized" }, VERIFIED_FACET],
		useCases: [{ name: "actor", of: x => x.actors?.length ? x.actors.map(a => doc.index[a]?.label ?? a) : ["No actors"] }, VERIFIED_FACET],
		interfaces: [{ name: "protocol", of: x => [x.protocol?.name || "No protocol"] }, VERIFIED_FACET],
		resources: [{ name: "type", of: x => [x.type || "Untyped"] }],
	};
	const label = id => doc.index[id]?.label ?? id;

	/* ---------- building blocks ---------- */

	/** Click-to-edit text field; required fields of the page's item show "Required" while empty. */
	const textField = (obj, field, placeholder = "Empty", extra = "") =>
		`<span class="f ${isRequiredField(obj, field) && obj.id === state.selectedId ? "req" : ""}" data-field="${field}" data-obj="${obj.id}" data-ph="${esc(placeholder)}" ${extra}>${esc(obj[field])}</span>`;

	/** Picker field showing a value with a chevron. */
	const pickField = (pick, value, placeholder = "") =>
		`<span class="f pick" data-pick="${pick}" data-ph="${esc(placeholder)}">${esc(value)}${value ? icon("chevron-down", 13) : ""}</span>`;

	/** One label/value row of a page's details grid. */
	const propRow = (title, iconName, inner, wide = false) =>
		`<div class="k ${wide ? "wide-k" : ""}">${icon(iconName, 14)}${title}</div><div class="v ${wide ? "wide" : ""}">${inner}</div>`;

	/** Collapsible section title, with extra controls shown only while open. */
	const sectionHead = (key, title, extra = "") =>
		`<div class="sec-title ${state.sections[key] ? "open" : ""}" data-sectoggle="${key}">${icon("chevron-right", 16)}<h2>${title}</h2>${state.sections[key] ? extra : ""}</div>`;

	/** Notes rendered as Markdown at rest, raw while editing. */
	const notesBox = (obj, className = "") =>
		`<div class="notes ${className} ${obj.notes ? "" : "empty"}" data-notes="${obj.id}" title="Click to edit notes (Markdown)">${obj.notes ? renderMarkdown(obj.notes) : "Add notes…"}</div>`;

	/** Wrapper of a list field: clicking it enters edit mode, which reveals add and remove buttons. */
	const editableList = (key, inner, isEmpty, addAttr, { rows = false, empty = "Empty" } = {}) =>
		`<div class="list ${rows ? "rows" : "chips"} ${state.editList === key ? "editing" : ""}" data-list="${key}">
			${inner}${isEmpty ? `<span class="ph">${empty}</span>` : ""}
			<span class="chip add" ${addAttr}>${icon("plus", 12)}add</span></div>`;

	/** Editable list of plain strings stored on an item (technologies, source locations, prerequisites). */
	const stringList = (obj, field, { mono = false } = {}) => {
		const values = obj[field] ?? [];
		return editableList(`${obj.id}:${field}`, values.map((value, i) =>
			`<span class="chip ${mono ? "mono" : ""}">${esc(value)}<span class="x" data-rm="${obj.id}|${field}|${i}">${icon("x", 12)}</span></span>`).join(""),
		!values.length, `data-add="${obj.id}|${field}"`);
	};

	/** Chip for another item: its id pill opens the item's page. */
	const itemChip = (id, removeAttr = "") =>
		`<span class="chip">${icon(getItemKind(id)?.icon ?? "circle-help", 12)}${pill(id)}${esc(doc.index[id] ? label(id) : "missing")}${removeAttr ? `<span class="x" ${removeAttr}>${icon("x", 12)}</span>` : ""}</span>`;

	/** Editable list of ids, as chips. `removeAttr(id, i)` builds each chip's remove attribute. */
	const idList = (key, ids, addAttr, removeAttr, empty = "Empty") =>
		editableList(key, ids.map((id, i) => itemChip(id, removeAttr(id, i))).join(""), !ids.length, addAttr, { empty });

	/** Read-only chips for related items, or a dash. */
	const relatedChips = ids => ids.length ? `<div class="chips-ro">${ids.map(id => itemChip(id)).join("")}</div>` : `<span class="none">—</span>`;

	/** Ids of decisions that reference an item. */
	const decisionsAbout = id => doc.map.decisions.filter(d => d.references?.includes(id)).map(d => d.id);

	/** Title, id pill, delete button and summary at the top of every page. */
	const pageHeader = (item, kicker) => `<div class="kicker">${kicker}</div>
		<div class="title-row">${textField(item, "label", "Name", 'style="font-size:22px;font-weight:650"')}${pill(item.id)}
			<span class="fill"></span>
			<button type="button" class="icon-btn danger" data-act="delete" title="Delete">${icon("trash-2")}</button></div>
		<div class="summary">${textField(item, "summary", "Short description, ~20 words")}</div>`;

	/* ---------- use case steps ---------- */

	/** Tree of a use case's steps, editable in place: each step can get a following step, a branch, or go away. */
	function stepTree(useCase) {
		const rows = getStepRows(useCase.steps ?? []);
		return `<div class="steps">${rows.map(row => `<div class="step" style="--depth:${row.depth}">
				<span class="step-n">${esc(row.number)}</span>
				<span class="f step-action" data-step="${useCase.id}|${row.path}" data-ph="What happens">${esc(row.step.action)}</span>
				<span class="step-tools">
					<button type="button" class="icon-btn" data-stepnext="${useCase.id}|${row.path}" title="Add a step after this one">${icon("plus", 14)}</button>
					<button type="button" class="icon-btn" data-stepbranch="${useCase.id}|${row.path}" title="Fork an alternative flow">${icon("git-branch", 14)}</button>
					<button type="button" class="icon-btn danger" data-stepdel="${useCase.id}|${row.path}" title="Remove step">${icon("x", 14)}</button>
				</span></div>`).join("")}
			<button type="button" class="step-add" data-stepadd="${useCase.id}">${icon("plus", 13)}Add step</button></div>`;
	}

	/* ---------- spec fields, shared by cards and pages ---------- */

	/** Chip with a spec's verification state. */
	const verifiedChip = spec => `<span class="chip">${icon(spec.verifiedBy?.length ? "shield-check" : "shield-alert", 12)}${spec.verifiedBy?.length ? "verified by " + spec.verifiedBy.length : "not verified"}</span>`;

	/** Editable "verified by" list of a spec. */
	const verifiedByList = spec => idList(`${spec.id}:verifiedBy`, spec.verifiedBy ?? [], `data-verify="${spec.id}"`, (id, i) => `data-unverify="${spec.id}|${i}"`, "Nothing yet");

	/** Protocol part of an interface, click to edit. */
	const protocolField = (spec, part, placeholder) =>
		`<span class="f" data-protocol="${part}" data-obj="${spec.id}" data-ph="${esc(placeholder)}">${esc(spec.protocol?.[part])}</span>`;

	/** Editable fields of a spec or resource, as `{ title, icon, html }` rows. */
	function getSpecRows(kind, spec) {
		const id = spec.id;
		if (kind.key === "requirements") return [
			{ title: "Category", icon: "tag", html: textField(spec, "category", "performance, security…") },
			{ title: "Verified by", icon: "shield-check", html: verifiedByList(spec) },
		];
		if (kind.key === "useCases") return [
			{ title: "Actors", icon: "users", html: idList(`${id}:actors`, spec.actors ?? [], `data-addactor="${id}"`, (actorId, i) => `data-unactor="${id}|${i}"`) },
			{ title: "Prerequisites", icon: "list-todo", html: stringList(spec, "prerequisites") },
			{ title: "Steps", icon: "list-tree", html: stepTree(spec) },
			{ title: "Verified by", icon: "shield-check", html: verifiedByList(spec) },
		];
		if (kind.key === "interfaces") {
			const users = doc.map.relations.filter(r => r.reliesOn?.includes(id)).map(r => r.id);
			return [
				{ title: "Protocol", icon: "radio", html: protocolField(spec, "name", "HTTPS, stdio, MQTT…") },
				{ title: "Protocol specs", icon: "file-text", html: protocolField(spec, "additionalSpecs", "Method, payload schema…") },
				{ title: "Relied on by", icon: "arrow-right-left", html: relatedChips(users) },
				{ title: "Verified by", icon: "shield-check", html: verifiedByList(spec) },
			];
		}
		return [
			{ title: "Type", icon: "shapes", html: textField(spec, "type", "diagram, document…") },
			{ title: "Location", icon: "link", html: textField(spec, "location", "Path or URL", 'style="font-family:var(--mono)"') },
		];
	}

	/** Image preview of a resource, or a note on why there's none. */
	const resourcePreview = resource => isImageLocation(resource.location)
		? `<a href="${esc(getResourceUrl(resource.location))}" target="_blank" class="preview"><img src="${esc(getResourceUrl(resource.location))}" alt="${esc(resource.label)}" onerror="this.parentElement.classList.add('broken')"><span class="missing">${icon("image-off", 18)}Can't load ${esc(resource.location)}</span></a>`
		: `<div class="preview broken"><span class="missing">${icon("file", 18)}${resource.location ? "Not an image: " + esc(resource.location) : "No location set"}</span></div>`;

	/** Tags of a closed card. */
	function getCardTags(kind, spec) {
		if (kind.key === "requirements") return (spec.category ? `<span class="chip">${esc(spec.category)}</span>` : "") + verifiedChip(spec);
		if (kind.key === "useCases") return (spec.actors ?? []).map(a => `<span class="chip">${icon("user", 12)}${esc(label(a))}</span>`).join("")
			+ `<span class="chip">${pluralize(countSteps(spec.steps ?? []), "step")}</span>` + verifiedChip(spec);
		if (kind.key === "interfaces") return (spec.protocol?.name ? `<span class="chip">${icon("radio", 12)}${esc(spec.protocol.name)}</span>` : "") + verifiedChip(spec);
		return spec.type ? `<span class="chip">${esc(spec.type)}</span>` : "";
	}

	/** A spec (or resource) card: closed shows label, summary and tags; open makes every field editable. */
	function specCard(kind, { id, from, via }) {
		const spec = doc.index[id];
		const key = id + (from ? "@" + from.id : "");
		const open = state.openCard === key;
		const fromChip = from ? `<span class="chip from">${icon(via === "part of" ? "corner-left-up" : "link", 12)}from ${esc(from.label)}</span>` : "";
		const tags = open ? fromChip : getCardTags(kind, spec) + fromChip;
		return `<div class="card ${from ? "inherited" : ""} ${open ? "open" : ""}" data-card="${key}">
			<div class="top"><span class="lbl">${open ? textField(spec, "label", "Label") : esc(spec.label)}</span>${pill(id)}
				<button type="button" class="icon-btn menu-btn" data-cardmenu="${kind.key}|${id}|${from?.id ?? ""}">${icon("ellipsis", 15)}</button></div>
			<div class="sum">${open ? textField(spec, "summary", "Summary") : esc(spec.summary) || `<span class="none">No summary</span>`}</div>
			${open ? `<div class="sec-head">Notes</div>${notesBox(spec)}` : ""}
			${tags ? `<div class="tags">${tags}</div>` : ""}
			${open ? `<div class="more">${kind.key === "resources" ? `<div class="preview-wrap">${resourcePreview(spec)}</div>` : ""}
				${getSpecRows(kind, spec).map(row => `<span class="k">${row.title}</span><div class="mv">${row.html}</div>`).join("")}</div>` : ""}</div>`;
	}

	/* ---------- component page ---------- */

	/** Filter pill markup; labels are title-cased. */
	const filterPill = (facet, value, text, iconHtml = "") =>
		`<span class="fpill ${state.filters[facet]?.has(value) ? "on" : ""}" data-filter="${esc(facet)}" data-value="${esc(value)}">${iconHtml}${esc(titleCase(text))}</span>`;

	/** Whether any of the values passes a facet's selected pills (all pass when none is selected). */
	const passesFilter = (facet, values) => !state.filters[facet]?.size || values.some(value => state.filters[facet].has(value));

	/** A group of spec cards of one kind with its facet pills; resources render as their own section. */
	function specGroup(kind, cards, { section = false } = {}) {
		const facets = facetsByKind[kind.key].map(facet => {
			let values = [...new Set(cards.flatMap(card => facet.of(doc.index[card.id])))].sort();
			if (facet.first && values.includes(facet.first)) values = [facet.first, ...values.filter(v => v !== facet.first)];
			if (facet.order) values = facet.order.filter(v => values.includes(v));
			return { ...facet, key: `${kind.key}.${facet.name}`, values };
		});
		const shown = cards.filter(card => (section || passesFilter("source", [card.from?.id ?? "native"])) && facets.every(facet => passesFilter(facet.key, facet.of(doc.index[card.id]))));
		const count = `<span class="count">${shown.length !== cards.length ? `${shown.length} of ${cards.length}` : cards.length}</span>`;
		const addButton = `<button type="button" class="icon-btn" data-addspec="${kind.key}" title="Add ${kind.one}">${icon("plus", 15)}</button>`;
		const pills = `<span class="fpills inline">${facets.map(facet => facet.values.map(v => filterPill(facet.key, v, v)).join("")).join(`<span class="fsep"></span>`)}</span>`;
		const body = `<div class="cards">${shown.map(card => specCard(kind, card)).join("") || `<span class="none">${cards.length ? "No matches" : "None"}</span>`}</div>`;
		if (section) return `<div class="spec-group section">${sectionHead(kind.key, kind.title, count + addButton + pills)}${state.sections[kind.key] ? body : ""}</div>`;
		return `<div class="spec-group"><h3>${icon(kind.icon, 15)}${kind.title} ${count}${addButton}${pills}</h3>${body}</div>`;
	}

	/** Remove button of a link row. */
	const unlinkButton = (field, id) => `<span class="x" data-unlink="${field}|${id}">${icon("x", 13)}</span>`;

	/** Row for a parent or subcomponent. */
	const componentRow = (other, field) => `<div class="lrow" data-goto="${other.id}"><span class="lname">${esc(other.label)}</span>
		<span class="ldepth">${esc(other.depth)}</span>${pill(other.id)}${unlinkButton(field, other.id)}</div>`;

	/** "<this> <kind> <target> <id> · relies on N", or "<source> <id> <kind> <this> · relies on N" for incoming ones. */
	const relationRow = (component, relation, field) => {
		const outgoing = field === "dependsOn", other = doc.index[outgoing ? relation.to : relation.from];
		const self = `<span class="lname self">${esc(component.label)}</span>`;
		const them = `<span class="lname">${esc(other?.label ?? "?")}</span>${pill(other?.id ?? "?")}`;
		const kind = `<span class="lkind" data-relkind="${relation.id}" title="Change kind">${esc(relation.kind)}</span>`;
		return `<div class="lrow" data-goto="${other?.id ?? ""}" title="${esc(relation.id)} · ${esc(relation.label)}">
			${outgoing ? self + kind + them : them + kind + self}<span class="ldot">·</span>
			<span class="lrely" data-relies="${relation.id}" title="Choose the specs this relation relies on">relies on ${relation.reliesOn?.length ?? 0}</span>
			<span class="lopen" data-pill="${relation.id}" title="Open relation ${esc(relation.id)}">${icon("arrow-up-right", 13)}</span>${unlinkButton(field, relation.id)}</div>`;
	};

	/** A list of link rows, editable in place. */
	const rowList = (field, rows) => editableList(field, rows.join(""), !rows.length, `data-addlink="${field}"`, { rows: true });

	/** Parent components, subcomponents, depends on and used by rows. */
	function linkRows(component) {
		const parents = (component.partOf ?? []).map(id => doc.index[id]).filter(Boolean);
		const outgoing = doc.map.relations.filter(r => r.from === component.id), incoming = doc.map.relations.filter(r => r.to === component.id);
		return propRow("Parent components", "arrow-up-from-line", rowList("parents", parents.map(o => componentRow(o, "parents"))), true)
			+ propRow("Subcomponents", "arrow-down-from-line", rowList("children", getChildren(doc.map, component.id).map(o => componentRow(o, "children"))), true)
			+ propRow("Depends on", "arrow-right-from-line", rowList("dependsOn", outgoing.map(r => relationRow(component, r, "dependsOn"))), true)
			+ propRow("Used by", "arrow-left-to-line", rowList("usedBy", incoming.map(r => relationRow(component, r, "usedBy"))), true);
	}

	/** The page of a component: details, links, specs (own and related) and resources. */
	function componentPage(component) {
		const groups = SPEC_KINDS.map(kind => ({ kind, cards: getSpecCards(doc.map, doc.index, component, kind.key, state.showRelated) }));
		const visible = groups.filter(group => passesFilter("kind", [group.kind.key]));
		// source pills only list components that feed the spec kinds currently shown
		const sources = [...new Map(visible.flatMap(group => group.cards).filter(card => card.from).map(card => [card.from.id, card.from])).values()];
		state.filters.source?.forEach(id => { if (!sources.some(source => source.id === id)) state.filters.source.delete(id); });
		const resources = (component.resources ?? []).filter(id => doc.index[id]).map(id => ({ id }));
		return `<div class="title-row">${textField(component, "label", "Component name", 'style="font-size:22px;font-weight:650"')}${pill(component.id)}
				<span class="fill"></span>
				<button type="button" class="icon-btn danger" data-act="delete" title="Delete component">${icon("trash-2")}</button></div>
			<div class="summary">${textField(component, "summary", "Short description, ~20 words")}</div>
			${sectionHead("details", "Details")}
			${state.sections.details ? notesBox(component, "outlined") : ""}
			<div class="props" ${state.sections.details ? "" : "hidden"}>
				${propRow("Depth", "layers", textField(component, "depth", "system, service, library…"))}
				${propRow("Level", "gauge", pickField("level", component.level))}
				${propRow("Folder", "folder", pickField("folder", getFolderPath(doc.index, component.folder), "No folder"))}
				${propRow("Technologies", "cpu", stringList(component, "technologies"))}
				${propRow("Source", "file-code", stringList(component, "sourceLocation", { mono: true }))}
				${propRow("Physical location", "server", textField(component, "physicalLocation"))}
				${linkRows(component)}
			</div>
			${sectionHead("specs", "Specs", `<span style="flex:1"></span><span class="toggle ${state.showRelated ? "on" : ""}" data-act="related"><span class="sw"></span>Show related specs</span>`)}
			${state.sections.specs ? `<div class="fpills">${SPEC_KINDS.map(kind => filterPill("kind", kind.key, kind.title, icon(kind.icon, 12))).join("")}
				${sources.length ? `<span class="fsep"></span>${sources.map(source => filterPill("source", source.id, `From ${source.label}`)).join("")}` : ""}</div>
			${visible.map(group => specGroup(group.kind, group.cards)).join("")}` : ""}
			${specGroup(RESOURCE_KIND, resources, { section: true })}`;
	}

	/* ---------- pages of other items ---------- */

	/** Rows specific to each kind of item, as `{ title, icon, html }`. */
	function getItemRows(kind, item) {
		const id = item.id;
		const verifies = SPEC_KINDS.flatMap(k => doc.map[k.key]).filter(spec => spec.verifiedBy?.includes(id)).map(spec => spec.id);
		const decisions = { title: "Decisions", icon: "scale", html: relatedChips(decisionsAbout(id)) };
		if (SPEC_KINDS.includes(kind) || kind === RESOURCE_KIND) {
			const holders = getHolders(doc.map, id).map(c => c.id);
			return [
				{ title: kind === RESOURCE_KIND ? "Used by" : "Component", icon: "box", html: relatedChips(holders) },
				...getSpecRows(kind, item),
				...(kind !== RESOURCE_KIND ? [{ title: "Verifies", icon: "shield", html: relatedChips(verifies) }] : []),
				...(kind.key !== "interfaces" && kind !== RESOURCE_KIND ? [{ title: "Relied on by", icon: "arrow-right-left", html: relatedChips(doc.map.relations.filter(r => r.reliesOn?.includes(id)).map(r => r.id)) }] : []),
				decisions,
			];
		}
		if (kind.key === "tests") return [
			{ title: "Type", icon: "shapes", html: textField(item, "type", "unit, integration, e2e, screenshot…") },
			{ title: "Location", icon: "file-code", html: textField(item, "location", "Path of the test file", 'style="font-family:var(--mono)"') },
			{ title: "Test name", icon: "text-cursor", html: textField(item, "testName", "Whole file") },
			{ title: "Verifies", icon: "shield-check", html: idList(`${id}:verifies`, verifies, `data-addverifies="${id}"`, specId => `data-unverifies="${id}|${specId}"`, "Nothing yet") },
			decisions,
		];
		if (kind.key === "actors") {
			const useCases = doc.map.useCases.filter(u => u.actors?.includes(id)).map(u => u.id);
			return [{ title: "Use cases", icon: "route", html: idList(`${id}:useCases`, useCases, `data-addusecase="${id}"`, ucId => `data-unusecase="${id}|${ucId}"`) }, decisions];
		}
		if (kind.key === "relations") return [
			{ title: "From", icon: "arrow-up-from-dot", html: `${pickField("from", label(item.from))}<button type="button" class="icon-btn" data-act="flip" title="Flip direction">${icon("arrow-up-down", 15)}</button>` },
			{ title: "Kind", icon: "tag", html: `<span class="f pick" data-relkind="${id}">${esc(item.kind)}${icon("chevron-down", 13)}</span>` },
			{ title: "To", icon: "arrow-down-to-dot", html: pickField("to", label(item.to)) },
			{ title: "Relies on", icon: "plug", html: idList(`${id}:reliesOn`, item.reliesOn ?? [], `data-relies="${id}"`, specId => `data-unrely="${id}|${specId}"`, "Nothing yet") },
			decisions,
		];
		if (kind.key === "folders") return [
			{ title: "Parent folder", icon: "folder-up", html: pickField("parent", getFolderPath(doc.index, item.parent), "Top level") },
			{ title: "Components", icon: "box", html: relatedChips(doc.map.components.filter(c => c.folder === id).map(c => c.id)) },
			{ title: "Subfolders", icon: "folders", html: relatedChips(doc.map.folders.filter(f => f.parent === id).map(f => f.id)) },
		];
		return [{ title: "References", icon: "link", html: idList(`${id}:references`, item.references ?? [], `data-addref="${id}"`, (refId, i) => `data-unref="${id}|${i}"`) }, decisions];
	}

	/** Line above the title: kind, and where the item belongs. */
	function getKicker(kind, item) {
		const owner = SPEC_KINDS.includes(kind) ? getSpecOwner(doc.map, item.id) : null;
		return `${icon(kind.icon, 13)}${titleCase(kind.one)}${owner ? ` · in <span class="kick-link" data-pill="${owner.id}">${esc(owner.label)}</span>` : ""}`;
	}

	/** The page of any item that isn't a component. */
	function itemPage(item) {
		const kind = getItemKind(item.id);
		return `${pageHeader(item, getKicker(kind, item))}
			${sectionHead("details", "Details")}
			${state.sections.details ? `${notesBox(item, "outlined")}
				${kind === RESOURCE_KIND ? `<div class="page-preview">${resourcePreview(item)}</div>` : ""}
				<div class="props">${getItemRows(kind, item).map(row => propRow(row.title, row.icon, row.html, true)).join("")}</div>` : ""}`;
	}

	return { componentPage, itemPage };
}
