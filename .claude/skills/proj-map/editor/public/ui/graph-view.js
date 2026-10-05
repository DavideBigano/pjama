import { escapeHtml as esc, wrapNodeLabel } from "../lib/format.js";
import {
	NODE_RADIUS as R, findFreeSpot, getArrowPoints, getAutoPanDelta, getBezierPoint, getBoundingBox, getDistance, getEdgePath,
	getFitCamera, getFocusCamera, getInitialPositions, getNodeBox, getPillOffset, getZoomedCamera, layoutEdges, toWorld,
} from "../lib/geometry.js";
import {
	addPartOf, canAddParent, createComponent, createRelation, deleteRelation, flipRelation, getChildren, getOwnSpecs,
	getRelationKinds, getSpecKind, getSpecOwner, isUntouchedRelation, removeFromOptionalList, removePartOf, swapPartOf,
} from "../lib/model.js";
import { formatRoute } from "../lib/route.js";
import {
	closePopover, confirmDelete, icon, inlineEdit, isPopoverOpen, isTyping, openDialog, openMenu, openMenuAt, openPicker, pill,
	refreshIcons, renderMarkdown, selectAllText,
} from "./dom.js";

const LAYOUT_SAVE_DELAY_MS = 400;

/** Add-edge handles shown beside the hovered or selected node. */
const HANDLES = [
	{ mode: "rel", dy: -24, width: 112, label: "depends on", color: "#52525b", dash: "" },
	{ mode: "part", dy: 4, width: 92, label: "part of", color: "#7c3aed", dash: 'stroke-dasharray="4 3"' },
];

/** Id of a containment edge: "P:<child>><parent>". */
const partEdgeId = (child, parent) => `P:${child}>${parent}`;
/** Child and parent of a containment edge id. */
const partEnds = id => id.slice(2).split(">");

/**
 * The Graph tab: components as round nodes, containment and relations as curved edges, with a side
 * panel to edit the selection. Node positions are saved apart from the map through `saveLayout`.
 */
export function createGraphView({ doc, onChange, saveLayout }) {
	const root = document.getElementById("viewGraph");
	const svg = document.getElementById("svg");
	const panel = document.getElementById("panel");
	const tip = document.getElementById("tip");
	const linkbar = document.getElementById("linkbar");
	const showPart = document.getElementById("showPart");
	const showRel = document.getElementById("showRel");

	const camera = { x: 0, y: 0, k: 1 };
	const sections = { details: true, relies: true };
	let selection = null;          // { type: "node" | "rel" | "part", id }
	let hoverNode = null, hoverEdge = null;
	let link = null;               // { mode: "rel" | "part", from, at, target, moved, armed }
	let drag = null, pan = null, pointer = null, animation = null, fitted = false, layoutTimer = null;

	const isActive = () => !root.hidden;
	const positions = () => doc.positions;
	const getView = () => [svg.clientWidth, svg.clientHeight];

	/* ---------- model ---------- */

	/** Edges to draw, honouring the legend toggles. */
	function getEdges() {
		const edges = [];
		if (showPart.checked)
			for (const c of doc.map.components) for (const parent of c.partOf ?? []) if (doc.index[parent]) edges.push({ type: "part", id: partEdgeId(c.id, parent), from: c.id, to: parent });
		if (showRel.checked)
			for (const r of doc.map.relations) if (doc.index[r.from] && doc.index[r.to] && r.from !== r.to) edges.push({ type: "rel", id: r.id, from: r.from, to: r.to, kind: r.kind });
		return edges;
	}

	/** Whether a link being drawn may end on a component. */
	function isValidTarget(mode, from, to) {
		if (!to || to === from) return false;
		return mode === "part" ? canAddParent(doc.index, from, to) : true;
	}

	/** Fills in positions for components that have none, and drops those of deleted ones. */
	function syncPositions() {
		const before = JSON.stringify(doc.positions);
		doc.positions = getInitialPositions(doc.map, doc.index, doc.positions);
		if (JSON.stringify(doc.positions) !== before) scheduleLayoutSave();
	}

	/** Saves node positions shortly after the last move. */
	function scheduleLayoutSave() {
		clearTimeout(layoutTimer);
		layoutTimer = setTimeout(() => saveLayout({ positions: doc.positions }), LAYOUT_SAVE_DELAY_MS);
	}

	/* ---------- camera ---------- */

	/** Applies the camera to the world group. */
	const applyCamera = () => document.getElementById("world")?.setAttribute("transform", `translate(${camera.x},${camera.y}) scale(${camera.k})`);

	/** Moves the camera smoothly to a target. */
	function animateCamera(to, ms = 280) {
		cancelAnimationFrame(animation);
		const from = { ...camera }, start = performance.now();
		const step = now => {
			const t = Math.min(1, (now - start) / ms), eased = 1 - (1 - t) ** 3;
			for (const key of ["x", "y", "k"]) camera[key] = from[key] + (to[key] - from[key]) * eased;
			applyCamera();
			if (t < 1) animation = requestAnimationFrame(step);
		};
		animation = requestAnimationFrame(step);
	}

	/** Brings the selection into view following the 5/90/5 band rule. */
	function focusOn(target) {
		if (!target) return;
		const pos = positions();
		if (target.type === "node") return pos[target.id] && animateCamera(getFocusCamera(getNodeBox(pos[target.id]), pos[target.id], camera, getView()));
		const [a, b] = target.type === "part" ? partEnds(target.id) : [doc.index[target.id].from, doc.index[target.id].to];
		const box = getBoundingBox([getNodeBox(pos[a]), getNodeBox(pos[b])]);
		animateCamera(getFocusCamera(box, [(pos[a][0] + pos[b][0]) / 2, (pos[a][1] + pos[b][1]) / 2], camera, getView()));
	}

	/** Shows every node. */
	function fitAll(animate = true) {
		const target = getFitCamera(Object.values(positions()).map(p => getNodeBox(p)), getView());
		if (animate) animateCamera(target);
		else { Object.assign(camera, target); applyCamera(); }
	}

	/** Zooms around a screen point. */
	function zoomAt(point, factor) {
		cancelAnimationFrame(animation);
		Object.assign(camera, getZoomedCamera(camera, point, factor));
		applyCamera();
	}

	/* ---------- render ---------- */

	/** Markup of one node. */
	function nodeHtml(component, edges, classes) {
		const [x, y] = positions()[component.id];
		const lines = wrapNodeLabel(component.label), [px, py] = getPillOffset(component.id, edges, positions());
		return `<g class="node ${classes}" data-node="${component.id}" transform="translate(${x},${y})"><title>${esc(component.label)} · ${esc(component.depth)}</title>
			<circle class="body" r="${R}"/>
			${lines.map((line, i) => `<text class="t" text-anchor="middle" y="${(i - (lines.length - 1) / 2) * 14 - 3}">${esc(line)}</text>`).join("")}
			<text class="d" text-anchor="middle" y="${lines.length > 1 ? 23 : 16}">${esc(wrapNodeLabel(component.depth, 14)[0] === "Untitled" ? "" : wrapNodeLabel(component.depth, 14)[0])}</text>
			<g class="idpill" transform="translate(${px},${py})"><rect class="idp" x="-27" y="-8" width="54" height="16" rx="8"/><text class="i" text-anchor="middle" y="3.5">${component.id}</text></g></g>`;
	}

	/** Markup of the add-edge handles beside a node. */
	function handlesHtml(id) {
		const [x, y] = positions()[id];
		return HANDLES.map(h => `<g class="handle ${h.mode}" data-handle="${h.mode}" data-from="${id}" transform="translate(${x + R + 20},${y + h.dy})">
			<title>Drag (or click, then click) onto the component this one ${h.mode === "rel" ? "depends on" : "is part of"}</title>
			<rect width="${h.width}" height="20" rx="10"/>
			<circle cx="10" cy="10" r="6" fill="${h.color}"/><path d="M10,7 V13 M7,10 H13" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
			<line x1="21" y1="10" x2="33" y2="10" stroke="${h.color}" stroke-width="1.75" ${h.dash}/><path d="M37,10 L31,6.5 L31,13.5z" fill="${h.color}"/>
			<text x="43" y="14">${h.label}</text></g>`).join("");
	}

	/** Redraws the whole graph. */
	function draw() {
		doc.reindex();
		syncPositions();
		const pos = positions();
		const edges = layoutEdges(getEdges(), pos);
		const focus = selection?.type === "node" ? selection.id : null;
		const near = focus ? new Set([focus, ...edges.filter(e => e.from === focus || e.to === focus).flatMap(e => [e.from, e.to])]) : null;
		const isSelectedEdge = e => selection && selection.type === e.type && selection.id === e.id;
		const isDimEdge = e => (focus && e.from !== focus && e.to !== focus) || (selection && selection.type !== "node" && !isSelectedEdge(e));
		let html = "";
		for (const e of edges) html += `<g data-edge="${e.type}|${e.id}" class="${isDimEdge(e) ? "dim" : ""}"><path class="hit" d="${getEdgePath(e)}"/>
			<path class="edge ${e.type} ${isSelectedEdge(e) ? "sel" : ""} ${hoverEdge === e.id ? "hover" : ""}" d="${getEdgePath(e)}"/></g>`;
		if (link) {
			const p0 = pos[link.from], p2 = link.target ? pos[link.target] : link.at;
			html += `<path class="edge temp ${link.mode}" d="M${p0[0]},${p0[1]} L${p2[0]},${p2[1]}"/>`;
		}
		for (const c of doc.map.components) {
			const classes = [
				focus === c.id ? "sel" : "",
				link?.target === c.id ? "target" : "",
				link && c.id !== link.from && !isValidTarget(link.mode, link.from, c.id) ? "invalid" : "",
				near && !near.has(c.id) ? "dim" : "",
				selection && selection.type !== "node" && !edges.some(e => isSelectedEdge(e) && (e.from === c.id || e.to === c.id)) ? "dim" : "",
			].join(" ");
			html += nodeHtml(c, edges, classes);
		}
		// arrowheads and kind labels go above the nodes so nothing covers them
		for (const e of edges) {
			const middle = getBezierPoint(e.p0, e.c, e.p2, 0.5);
			html += `<g class="${isDimEdge(e) ? "dim" : ""}"><polygon class="mark ${e.type}" points="${getArrowPoints(e)}"/>
				${e.type === "rel" ? `<text class="elabel" x="${middle[0]}" y="${middle[1] - 6}" text-anchor="middle">${esc(e.kind)}</text>` : ""}</g>`;
		}
		const handleNode = link || drag?.moved || pan?.moved ? null : hoverNode ?? focus;
		if (handleNode && pos[handleNode]) html += handlesHtml(handleNode);
		svg.innerHTML = `<g id="world">${html}</g>`;
		applyCamera();
		svg.classList.toggle("linking", !!link);
		svg.classList.toggle("panning", !!pan?.moved);
		linkbar.classList.toggle("on", !!link);
		if (link) linkbar.textContent = `${link.mode === "rel" ? "Depends on…" : "Part of…"} click a component · move to the edges to scroll · Esc to cancel`;
	}

	/* ---------- pointer interaction ---------- */

	/** Pointer position in screen coordinates relative to the canvas. */
	const toScreen = event => { const rect = svg.getBoundingClientRect(); return [event.clientX - rect.left, event.clientY - rect.top]; };
	/** Component under a world point. */
	const nodeAt = point => doc.map.components.find(c => positions()[c.id] && getDistance(positions()[c.id], point) <= R)?.id ?? null;
	/** Whether a world point lies between a node and its handles, so the hover survives the trip. */
	const isNearHandles = (id, [wx, wy]) => { const [x, y] = positions()[id]; return wx > x - R && wx < x + R + 140 && wy > y - R - 6 && wy < y + R + 6; };

	/** Updates the link target under the pointer. */
	function updateLinkTarget() {
		const target = nodeAt(link.at);
		link.target = isValidTarget(link.mode, link.from, target) ? target : null;
	}

	svg.addEventListener("pointerdown", event => {
		if (event.button !== 0) return;
		cancelAnimationFrame(animation);
		const screen = toScreen(event), world = toWorld(camera, screen);
		pointer = screen;
		if (link?.armed) {
			const target = nodeAt(world);
			if (isValidTarget(link.mode, link.from, target)) createEdge(link.mode, link.from, target);
			link = null;
			return draw();
		}
		const handle = event.target.closest("[data-handle]");
		if (handle) {
			link = { mode: handle.dataset.handle, from: handle.dataset.from, at: world, target: null, moved: false };
			svg.setPointerCapture(event.pointerId);
			startAutoPan();
			return draw();
		}
		const node = event.target.closest("[data-node]");
		if (node) {
			const id = node.dataset.node, [x, y] = positions()[id];
			drag = { id, offset: [world[0] - x, world[1] - y], moved: false };
			return svg.setPointerCapture(event.pointerId);
		}
		const edge = event.target.closest("[data-edge]");
		if (edge) { const [type, id] = edge.dataset.edge.split("|"); return select({ type, id }); }
		pan = { start: screen, camera: { ...camera }, moved: false };
		svg.setPointerCapture(event.pointerId);
	});

	svg.addEventListener("pointermove", event => {
		const screen = toScreen(event), world = toWorld(camera, screen);
		pointer = screen;
		if (link) {
			link.at = world;
			link.moved ||= getDistance(world, positions()[link.from]) > R + 20;
			updateLinkTarget();
			return draw();
		}
		if (drag) {
			positions()[drag.id] = [Math.round(world[0] - drag.offset[0]), Math.round(world[1] - drag.offset[1])];
			drag.moved = true;
			return draw();
		}
		if (pan) {
			pan.moved ||= getDistance(screen, pan.start) > 3;
			camera.x = pan.camera.x + screen[0] - pan.start[0];
			camera.y = pan.camera.y + screen[1] - pan.start[1];
			applyCamera();
			return svg.classList.toggle("panning", pan.moved);
		}
		const over = event.target.closest("[data-node],[data-handle]");
		const nextHover = over ? (over.dataset.node ?? over.dataset.from) : hoverNode && positions()[hoverNode] && isNearHandles(hoverNode, world) ? hoverNode : null;
		const edgeEl = event.target.closest("[data-edge]"), nextEdge = edgeEl?.dataset.edge.split("|")[1] ?? null;
		showTip(edgeEl?.dataset.edge ?? null, screen);
		if (nextHover !== hoverNode || nextEdge !== hoverEdge) { hoverNode = nextHover; hoverEdge = nextEdge; draw(); }
	});

	svg.addEventListener("pointerup", () => {
		if (link && !link.armed) {
			if (link.target) { createEdge(link.mode, link.from, link.target); link = null; }
			else if (!link.moved) link.armed = true;
			else link = null;
			return draw();
		}
		if (drag) {
			if (!drag.moved) select({ type: "node", id: drag.id });
			else scheduleLayoutSave();
			drag = null;
			return draw();
		}
		if (pan) {
			if (!pan.moved) select(null);
			pan = null;
			svg.classList.remove("panning");
		}
	});
	svg.addEventListener("pointerleave", () => { if (!link) pointer = null; showTip(null); });
	svg.addEventListener("wheel", event => { event.preventDefault(); zoomAt(toScreen(event), Math.exp(-event.deltaY * 0.0015)); }, { passive: false });
	svg.addEventListener("dblclick", event => { if (!event.target.closest("[data-node],[data-edge],[data-handle]")) newComponent(toWorld(camera, toScreen(event))); });

	/** Tooltip with the hovered edge's name. */
	function showTip(edge, screen) {
		if (!edge || link || drag || pan) return tip.classList.remove("on");
		const [type, id] = edge.split("|");
		if (type === "rel") {
			const r = doc.index[id];
			tip.innerHTML = `${esc(r.label)} <span class="muted">· ${esc(doc.index[r.from].label)} ${esc(r.kind)} ${esc(doc.index[r.to].label)}</span>`;
		} else {
			const [child, parent] = partEnds(id);
			tip.innerHTML = `${esc(doc.index[child].label)} <span class="muted">is part of</span> ${esc(doc.index[parent].label)}`;
		}
		tip.style.left = screen[0] + 14 + "px";
		tip.style.top = screen[1] + 16 + "px";
		tip.classList.add("on");
	}

	/** While linking, scrolls the view when the pointer sits near its edges. */
	function startAutoPan() {
		const tick = () => {
			if (!link) return;
			if (pointer) {
				const [dx, dy] = getAutoPanDelta(pointer, getView());
				if (dx || dy) {
					camera.x += dx;
					camera.y += dy;
					link.at = toWorld(camera, pointer);
					updateLinkTarget();
					draw();
				}
			}
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	}

	svg.addEventListener("contextmenu", event => {
		const edge = event.target.closest("[data-edge]"), node = event.target.closest("[data-node]");
		if (!edge && !node) return;
		event.preventDefault();
		if (edge) {
			const [type, id] = edge.dataset.edge.split("|");
			select({ type, id });
			return openMenu(event.clientX, event.clientY, [
				{ icon: "arrow-left-right", label: type === "rel" ? "Flip direction" : "Swap parent and child", run: () => flipEdge({ type, id }) },
				{ icon: "trash-2", label: type === "rel" ? "Delete relation" : "Remove part of", danger: true, run: () => deleteEdge({ type, id }) },
			]);
		}
		const id = node.dataset.node;
		const arm = mode => { link = { mode, from: id, at: positions()[id], armed: true, moved: true }; startAutoPan(); draw(); };
		openMenu(event.clientX, event.clientY, [
			{ icon: "arrow-right", label: "Add dependency…", run: () => arm("rel") },
			{ icon: "arrow-up-right", label: "Make part of…", run: () => arm("part") },
			"-",
			{ icon: "panel-right-open", label: "Open in List", run: () => { location.hash = formatRoute({ view: "list", id }); } },
		]);
	});

	addEventListener("keydown", event => {
		if (!isActive() || document.querySelector(".overlay")) return;
		if (event.key === "Escape" && link) { link = null; return draw(); }
		if (event.key === "Escape" && !isPopoverOpen() && selection) return select(null);
		if ((event.key === "Delete" || event.key === "Backspace") && !isTyping() && !isPopoverOpen() && selection && selection.type !== "node") {
			event.preventDefault();
			deleteEdge(selection);
		}
	});
	showPart.addEventListener("change", () => select(null));
	showRel.addEventListener("change", () => select(null));
	document.getElementById("zoomIn").addEventListener("click", () => { const [w, h] = getView(); zoomAt([w / 2, h / 2], 1.25); });
	document.getElementById("zoomOut").addEventListener("click", () => { const [w, h] = getView(); zoomAt([w / 2, h / 2], 0.8); });
	document.getElementById("zoomFit").addEventListener("click", () => fitAll());
	document.getElementById("graphNewComp").addEventListener("click", () => newComponent());

	/* ---------- edits ---------- */

	/** Drops the selection when what it points to no longer exists. */
	function dropStaleSelection() {
		doc.reindex();
		const [child, parent] = selection?.type === "part" ? partEnds(selection.id) : [];
		const exists = !selection || (selection.type === "part" ? !!doc.index[child]?.partOf?.includes(parent) : !!doc.index[selection.id]);
		if (!exists) selection = null;
	}

	/** Re-renders after an edit. */
	function changed() {
		dropStaleSelection();
		draw();
		renderPanel();
		onChange();
	}

	/** Adds a component at a point (or near the view's center) and starts editing its name. */
	function newComponent(at) {
		const component = createComponent(doc.map);
		doc.reindex();
		const [w, h] = getView();
		positions()[component.id] = (at ?? findFreeSpot(toWorld(camera, [w / 2, h / 2]), positions())).map(Math.round);
		scheduleLayoutSave();
		select({ type: "node", id: component.id });
		onChange();
		const label = panel.querySelector('[data-field="label"]');
		label?.click();
		if (label) selectAllText(label);
	}

	/** Creates the edge drawn by the user and selects it; new relations start with their name in edit. */
	function createEdge(mode, from, to) {
		if (mode === "part") {
			addPartOf(doc.index, from, to);
			select({ type: "part", id: partEdgeId(from, to) });
		} else {
			const relation = createRelation(doc.map, from, to);
			doc.reindex();
			select({ type: "rel", id: relation.id });
			setTimeout(() => {
				const label = panel.querySelector('[data-field="label"]');
				label?.click();
				if (label) selectAllText(label);
			});
		}
		changed();
	}

	/** Deletes an edge; filled-in relations ask first. */
	function deleteEdge(target) {
		if (target.type === "part") {
			removePartOf(doc.index, ...partEnds(target.id));
			selection = null;
			return changed();
		}
		const relation = doc.index[target.id];
		const drop = () => { deleteRelation(doc.map, relation.id); selection = null; changed(); };
		if (isUntouchedRelation(relation)) return drop();
		confirmDelete(`Delete relation ${relation.id}?`, [
			`“${relation.label}”: ${doc.index[relation.from].label} ${relation.kind} ${doc.index[relation.to].label}`,
			...(relation.reliesOn?.length ? [`It relies on ${relation.reliesOn.join(", ")}; those specs stay on their components`] : []),
		], drop);
	}

	/** Flips a relation, or swaps parent and child unless that would create a cycle. */
	function flipEdge(target) {
		if (target.type === "rel") { flipRelation(doc.index[target.id]); return changed(); }
		const [child, parent] = partEnds(target.id);
		if (!swapPartOf(doc.index, child, parent))
			return openDialog({ title: "Can't swap", items: ["The parent is also an ancestor through another path; swapping would create a cycle"], actions: [], cancelLabel: "OK" });
		selection = { type: "part", id: partEdgeId(parent, child) };
		changed();
	}

	/* ---------- side panel ---------- */

	/** Selects a node or edge, shows it in the panel and brings it into view. */
	function select(target) {
		selection = target;
		draw();
		renderPanel();
		focusOn(target);
	}

	const sectionHead = (key, title, extra = "") => `<div class="sec-title ${sections[key] ? "open" : ""}" data-sectoggle="${key}">${icon("chevron-right", 16)}<h2>${title}</h2>${sections[key] ? extra : ""}</div>`;
	const textField = (obj, field, placeholder, extra = "") => `<span class="f" data-obj="${obj.id}" data-field="${field}" data-ph="${esc(placeholder)}" ${extra}>${esc(obj[field])}</span>`;
	const notesBox = obj => `<div class="notes outlined ${obj.notes ? "" : "empty"}" data-notes="${obj.id}">${obj.notes ? renderMarkdown(obj.notes) : "Add notes…"}</div>`;
	const componentChip = id => `<span class="chip link" data-goto="${id}">${esc(doc.index[id]?.label ?? id)} <span class="muted" style="font-size:11px">${id}</span></span>`;

	/** Renders the side panel for the selection (hidden when nothing is selected). */
	function renderPanel() {
		panel.classList.toggle("on", !!selection);
		if (!selection) { panel.innerHTML = ""; return; }
		const body = selection.type === "rel" ? relationPanel(doc.index[selection.id])
			: selection.type === "part" ? partPanel(...partEnds(selection.id)) : nodePanel(doc.index[selection.id]);
		panel.innerHTML = `<div class="panel-inner">${body}</div>`;
		refreshIcons();
	}

	/** Panel of a relation: name, notes, ends and kind, and the specs it relies on. */
	function relationPanel(relation) {
		const relied = (relation.reliesOn ?? []).filter(id => doc.index[id]);
		return `<div class="kicker"><span class="sw"></span>Relation · depends on</div>
			<div class="title-row">${textField(relation, "label", "Relation name", 'style="font-size:20px;font-weight:650"')}${pill(relation.id)}<span class="fill"></span>
				<button type="button" class="icon-btn danger" data-act="delete" title="Delete relation">${icon("trash-2")}</button></div>
			<div class="summary">${textField(relation, "summary", "Short description")}</div>
			${sectionHead("details", "Details")}
			${sections.details ? `${notesBox(relation)}<div class="props">
				<div class="k">${icon("arrow-up-from-dot", 14)}From</div><div class="v"><span class="f pick" data-pick="from">${esc(doc.index[relation.from].label)}${icon("chevron-down", 13)}</span>
					<button type="button" class="icon-btn swap" data-act="flip" title="Flip direction">${icon("arrow-up-down", 15)}</button></div>
				<div class="k">${icon("tag", 14)}Kind</div><div class="v"><span class="f pick" data-pick="kind">${esc(relation.kind)}${icon("chevron-down", 13)}</span></div>
				<div class="k">${icon("arrow-down-to-dot", 14)}To</div><div class="v"><span class="f pick" data-pick="to">${esc(doc.index[relation.to].label)}${icon("chevron-down", 13)}</span></div>
			</div>` : ""}
			${sectionHead("relies", `Relies on <span class="count">${relied.length}</span>`, `<button type="button" class="icon-btn" data-act="addrely" title="Add a spec">${icon("plus", 15)}</button>`)}
			${sections.relies ? `<div class="cards">${relied.map(id => reliedSpecCard(id, relation)).join("") || `<span class="none">Nothing yet. Add the interfaces or requirements of ${esc(doc.index[relation.to].label)} this relation depends on.</span>`}</div>` : ""}`;
	}

	/** Card of a spec a relation relies on, flagging specs owned by neither end. */
	function reliedSpecCard(id, relation) {
		const spec = doc.index[id], owner = getSpecOwner(doc.map, id);
		const thirdParty = owner && owner.id !== relation.from && owner.id !== relation.to;
		return `<div class="card"><div class="top">${icon(getSpecKind(id)?.icon ?? "file", 14)}<span class="lbl">${esc(spec.label)}</span>${pill(id)}
				<button type="button" class="icon-btn rm" data-unrely="${id}" title="Remove">${icon("x", 14)}</button></div>
			<div class="sum">${esc(spec.summary)}</div>
			<div class="tags">${owner ? `<span class="chip from">${icon(thirdParty ? "triangle-alert" : "box", 12)}${thirdParty ? "third-party: " : "from "}${esc(owner.label)}</span>` : `<span class="chip">unassigned</span>`}</div></div>`;
	}

	/** Panel of a containment edge, with the specs the child inherits. */
	function partPanel(child, parent) {
		const inherited = getOwnSpecs(doc.index[parent]).filter(s => doc.index[s.id]);
		return `<div class="kicker"><span class="sw part"></span>Containment · part of</div>
			<div class="title-row"><span style="font-size:20px;font-weight:650">Part of</span><span class="fill"></span>
				<button type="button" class="icon-btn" data-act="flip" title="Swap parent and child">${icon("arrow-up-down")}</button>
				<button type="button" class="icon-btn danger" data-act="delete" title="Remove part of">${icon("trash-2")}</button></div>
			<div class="summary">${componentChip(child)} is part of ${componentChip(parent)}</div>
			<p class="none" style="margin:6px 0 0">${esc(doc.index[child].label)} inherits every spec of ${esc(doc.index[parent].label)}, and of its parents.</p>
			${sectionHead("relies", `Inherited from ${esc(doc.index[parent].label)} <span class="count">${inherited.length}</span>`)}
			${sections.relies ? `<div class="cards">${inherited.map(({ id, kind }) => `<div class="card"><div class="top">${icon(kind.icon, 14)}<span class="lbl">${esc(doc.index[id].label)}</span>${pill(id)}</div>
				<div class="sum">${esc(doc.index[id].summary)}</div></div>`).join("") || `<span class="none">${esc(doc.index[parent].label)} has no specs of its own.</span>`}</div>` : ""}`;
	}

	/** Panel of a component: name, summary and neighbours. */
	function nodePanel(component) {
		const outgoing = doc.map.relations.filter(r => r.from === component.id), incoming = doc.map.relations.filter(r => r.to === component.id);
		const row = (label, iconName, value) => `<div class="k">${icon(iconName, 14)}${label}</div><div class="v">${value || `<span class="none">—</span>`}</div>`;
		return `<div class="kicker">${icon("circle", 12)}Component</div>
			<div class="title-row">${textField(component, "label", "Component name", 'style="font-size:20px;font-weight:650"')}${pill(component.id)}</div>
			<div class="summary">${textField(component, "summary", "Short description")}</div>
			<div class="props" style="margin-top:8px">
				${row("Depth", "layers", textField(component, "depth", "system, service…"))}
				${row("Part of", "arrow-up-from-line", (component.partOf ?? []).map(componentChip).join(""))}
				${row("Contains", "arrow-down-from-line", getChildren(doc.map, component.id).map(k => componentChip(k.id)).join(""))}
				${row("Depends on", "arrow-right-from-line", [...new Set(outgoing.map(r => r.to))].map(componentChip).join(""))}
				${row("Used by", "arrow-left-to-line", [...new Set(incoming.map(r => r.from))].map(componentChip).join(""))}
			</div>
			<a class="open-link" href="${formatRoute({ view: "list", id: component.id })}">${icon("arrow-right", 14)}Open in List</a>`;
	}

	/** Picker of specs a relation can rely on: the target's first, then the source's, then any other (third-party). */
	function openReliesPicker(anchor, relation) {
		const have = new Set(relation.reliesOn ?? []);
		const options = c => getOwnSpecs(c).filter(s => !have.has(s.id) && doc.index[s.id]).map(s => ({ id: s.id, label: doc.index[s.id].label, icon: s.kind.icon, owner: c.label }));
		const others = doc.map.components.filter(c => c.id !== relation.from && c.id !== relation.to);
		openPicker(anchor, {
			placeholder: "Search specs…",
			groups: [
				{ title: `${doc.index[relation.to].label} (to)`, items: options(doc.index[relation.to]) },
				{ title: `${doc.index[relation.from].label} (from)`, items: options(doc.index[relation.from]) },
				{ title: "Other components · check for a missing edge", items: others.flatMap(options) },
			],
			onPick: id => { (relation.reliesOn ??= []).push(id); changed(); },
		});
	}

	panel.addEventListener("click", event => {
		if (event.target.closest(".notes a")) return;
		const target = event.target.closest("[data-sectoggle],[data-field],[data-notes],[data-pick],[data-act],[data-unrely],[data-goto]");
		if (!target || target.isContentEditable) return;
		const data = target.dataset;
		if (data.sectoggle) { sections[data.sectoggle] = !sections[data.sectoggle]; return renderPanel(); }
		if (data.field) {
			const obj = doc.index[data.obj], field = data.field;
			return inlineEdit(target, value => { if (field === "label" && !value) return renderPanel(); obj[field] = value; changed(); }, renderPanel);
		}
		if (data.notes) {
			const obj = doc.index[data.notes];
			target.classList.add("editing");
			target.classList.remove("empty");
			target.textContent = obj.notes ?? "";
			return inlineEdit(target, value => { if (value) obj.notes = value; else delete obj.notes; changed(); }, renderPanel, { multiline: true });
		}
		if (data.goto) return select({ type: "node", id: data.goto });
		const relation = selection.type === "rel" ? doc.index[selection.id] : null;
		if (data.unrely) { removeFromOptionalList(relation, "reliesOn", data.unrely); return changed(); }
		if (data.act === "delete") return deleteEdge(selection);
		if (data.act === "flip") return flipEdge(selection);
		if (data.act === "addrely") return openReliesPicker(target, relation);
		if (data.pick === "kind") {
			return openMenuAt(target, [...getRelationKinds(doc.map).map(kind => ({ label: kind, on: relation.kind === kind, run: () => { relation.kind = kind; changed(); } })), "-",
				{ icon: "pencil", label: "Custom kind…", run: () => inlineEdit(target, value => { if (value) relation.kind = value; changed(); }, renderPanel) }]);
		}
		if (data.pick === "from" || data.pick === "to") {
			const end = data.pick, other = end === "from" ? relation.to : relation.from;
			return openPicker(target, { placeholder: "Search components…", options: doc.map.components.filter(c => c.id !== other).map(c => ({ id: c.id, label: c.label, owner: c.depth })),
				onPick: id => { relation[end] = id; changed(); } });
		}
	});

	return {
		/** Shows the tab; the first time, fits every node in view. */
		show() {
			closePopover();
			dropStaleSelection();
			draw();
			renderPanel();
			if (!fitted) { fitAll(false); fitted = true; }
			refreshIcons();
		},
		/** Re-renders after the map was replaced, dropping a selection that no longer exists. */
		reset() {
			if (!isActive()) return;
			changed();
		},
	};
}
