/** Every top-level list of the map that holds items with an id. */
export const LISTS = ["components", "folders", "relations", "actors", "requirements", "useCases", "interfaces", "resources", "tests", "decisions"];

/** Spec kinds a component holds in `specs`. They belong to the component that created them. */
export const SPEC_KINDS = [
	{ key: "requirements", title: "Requirements", one: "requirement", icon: "list-checks", prefix: "REQ" },
	{ key: "useCases", title: "Use cases", one: "use case", icon: "route", prefix: "UC" },
	{ key: "interfaces", title: "Interfaces", one: "interface", icon: "plug", prefix: "IF" },
];

/** Resources hang off `component.resources` and can be shared between components. */
export const RESOURCE_KIND = { key: "resources", title: "Resources", one: "resource", icon: "paperclip", prefix: "RES", reusable: true };

/** Every kind of item with an id, with how to name and show it. */
export const ITEM_KINDS = [
	{ key: "components", title: "Components", one: "component", icon: "box", prefix: "COM" },
	{ key: "folders", title: "Folders", one: "folder", icon: "folder", prefix: "FOL" },
	{ key: "relations", title: "Relations", one: "relation", icon: "arrow-right-left", prefix: "REL" },
	{ key: "actors", title: "Actors", one: "actor", icon: "user", prefix: "ACT" },
	...SPEC_KINDS,
	RESOURCE_KIND,
	{ key: "tests", title: "Tests", one: "test", icon: "flask-conical", prefix: "T" },
	{ key: "decisions", title: "Decisions", one: "decision", icon: "scale", prefix: "D" },
];

/** The kind of any item, from its id prefix. */
export const getItemKind = id => ITEM_KINDS.find(kind => String(id ?? "").startsWith(kind.prefix + "-"));

/** Preset relation kinds named by the schema. */
export const RELATION_KINDS = ["uses", "calls", "reads", "writes", "distributes"];

export const UNTITLED_RELATION = "Untitled relation";

/** Finds a spec kind (or the resource kind) by its list key. */
export const getKind = key => [...SPEC_KINDS, RESOURCE_KIND].find(kind => kind.key === key);

/** A blank map, ready to be filled in. */
export const createEmptyMap = ({ mapId, mapSlug, label }) => ({
	mapId, mapSlug, label,
	components: [], folders: [], relations: [], actors: [], requirements: [], useCases: [], interfaces: [], resources: [], tests: [], decisions: [],
});

/** Adds any missing top-level list, so a hand-written map with omitted lists can be edited safely. */
export function fillMissingLists(map) {
	for (const list of LISTS) map[list] ??= [];
	for (const component of map.components) component.specs ??= {};
	return map;
}

/** Index of every item in the map by id. */
export function createIndex(map) {
	const index = {};
	for (const list of LISTS) for (const item of map[list] ?? []) index[item.id] = item;
	return index;
}

/** Next progressive id for a list: "COM-008" after "COM-007". */
export function getNextId(prefix, list) {
	const highest = Math.max(0, ...list.map(item => Number(item.id.split("-")[1]) || 0));
	return `${prefix}-${String(highest + 1).padStart(3, "0")}`;
}

/** Removes the first occurrence of a value from an array; tells whether it was there. */
export function removeItem(array, value) {
	const at = array?.indexOf(value) ?? -1;
	if (at >= 0) array.splice(at, 1);
	return at >= 0;
}

/** Removes a value from an optional list property and drops the property once the list is empty. */
export function removeFromOptionalList(owner, key, value) {
	removeItem(owner[key], value);
	if (owner[key] && !owner[key].length) delete owner[key];
}

/** Adds a value to an optional list property, creating the list when needed and skipping duplicates. */
export function addToOptionalList(owner, key, value) {
	owner[key] ??= [];
	if (!owner[key].includes(value)) owner[key].push(value);
}

/** Every component a component is part of, directly or through its parents, nearest first. */
export function getAncestors(index, component, seen = new Set()) {
	const out = [];
	for (const parentId of component.partOf ?? []) {
		if (seen.has(parentId) || !index[parentId]) continue;
		seen.add(parentId);
		out.push(index[parentId], ...getAncestors(index, index[parentId], seen));
	}
	return out;
}

/** Whether `ancestorId` contains `componentId`, directly or not. */
export const isAncestor = (index, ancestorId, componentId) =>
	!!index[componentId] && getAncestors(index, index[componentId]).some(c => c.id === ancestorId);

/** Every component inside a component, directly or not. */
export const getDescendants = (map, index, component) =>
	map.components.filter(other => getAncestors(index, other).includes(component));

/** Components that list `componentId` in their `partOf`. */
export const getChildren = (map, componentId) => map.components.filter(c => c.partOf?.includes(componentId));

/** Whether `parentId` can become a parent of `childId` without a duplicate or a containment cycle. */
export const canAddParent = (index, childId, parentId) =>
	!!index[childId] && !!index[parentId] && childId !== parentId
	&& !index[childId].partOf?.includes(parentId) && !isAncestor(index, childId, parentId);

/** "Backend / Storage" for a nested folder. */
export function getFolderPath(index, folderId) {
	const names = [];
	for (let folder = index[folderId]; folder; folder = index[folder.parent]) names.unshift(folder.label);
	return names.join(" / ");
}

/** Whether a folder sits inside another one, at any depth (a folder counts as inside itself). */
export function isFolderInside(index, folderId, ancestorId) {
	for (let folder = index[folderId]; folder; folder = index[folder.parent]) if (folder.id === ancestorId) return true;
	return false;
}

/** Components that hold an item, in their specs or their resources. */
export const getHolders = (map, itemId) =>
	map.components.filter(c => Object.values(c.specs ?? {}).some(list => list?.includes(itemId)) || c.resources?.includes(itemId));

/** The component whose specs hold a spec, if any. */
export const getSpecOwner = (map, specId) => map.components.find(c => Object.values(c.specs ?? {}).some(list => list?.includes(specId)));

/** The spec kind of a requirement, use case or interface id. */
export const getSpecKind = specId => SPEC_KINDS.find(kind => specId?.startsWith(kind.prefix + "-"));

/** A component's own specs, of every kind, as `{ id, kind }`. */
export const getOwnSpecs = component =>
	SPEC_KINDS.flatMap(kind => (component.specs?.[kind.key] ?? []).map(id => ({ id, kind })));

/** Relations leaving and entering a component. */
export const getRelationsOf = (map, componentId) => ({
	outgoing: map.relations.filter(r => r.from === componentId),
	incoming: map.relations.filter(r => r.to === componentId),
});

/** Preset kinds followed by any custom kind already used in the map. */
export const getRelationKinds = map => [...new Set([...RELATION_KINDS, ...map.relations.map(r => r.kind)])];

/**
 * Specs of one kind that apply to a component: its own, then (when `related` is on) those inherited
 * from every ancestor, then those its relations rely on, one step away. Each spec appears once.
 * Returns `{ id, from, via }`, where `from` is the component the spec came from (null when own).
 */
export function getSpecCards(map, index, component, kindKey, related) {
	const seen = new Set(), cards = [];
	const add = (id, from, via) => {
		if (seen.has(id) || !index[id]) return;
		seen.add(id);
		cards.push({ id, from, via });
	};
	for (const id of component.specs?.[kindKey] ?? []) add(id, null, null);
	if (!related) return cards;
	for (const ancestor of getAncestors(index, component)) for (const id of ancestor.specs?.[kindKey] ?? []) add(id, ancestor, "part of");
	for (const relation of map.relations.filter(r => r.from === component.id || r.to === component.id)) {
		for (const id of relation.reliesOn ?? []) {
			const owner = map.components.find(c => c.specs?.[kindKey]?.includes(id));
			if (owner && owner.id !== component.id) add(id, owner, relation.from === component.id ? `${relation.kind} →` : `← ${relation.kind}`);
		}
	}
	return cards;
}

/** Requirements, use cases and interfaces nothing verifies yet, with the component that owns each. */
export const getUnverifiedSpecs = map =>
	SPEC_KINDS.flatMap(kind => map[kind.key].filter(spec => !spec.verifiedBy?.length).map(spec => ({ spec, kind, owner: getSpecOwner(map, spec.id) })));

/** Every id reference in the map, as `{ owner, field, id, lists }` where `lists` are the lists the id may point into. */
export function getReferences(map) {
	const refs = [];
	const add = (owner, field, ids, lists) => { for (const id of [ids].flat()) if (id !== undefined) refs.push({ owner: owner.id, field, id, lists }); };
	const specLists = SPEC_KINDS.map(kind => kind.key);
	for (const list of LISTS) for (const item of map[list] ?? []) add(item, "resources", item.resources ?? [], ["resources"]);
	for (const c of map.components) {
		add(c, "folder", c.folder, ["folders"]);
		add(c, "partOf", c.partOf ?? [], ["components"]);
		for (const key of specLists) add(c, `specs.${key}`, c.specs?.[key] ?? [], [key]);
	}
	for (const f of map.folders) add(f, "parent", f.parent, ["folders"]);
	for (const r of map.relations) {
		add(r, "from", r.from, ["components"]);
		add(r, "to", r.to, ["components"]);
		add(r, "reliesOn", r.reliesOn ?? [], specLists);
	}
	for (const key of specLists) for (const spec of map[key]) add(spec, "verifiedBy", spec.verifiedBy ?? [], [...specLists, "tests"]);
	for (const u of map.useCases) add(u, "actors", u.actors ?? [], ["actors"]);
	for (const d of map.decisions) add(d, "references", d.references ?? [], LISTS.filter(l => l !== "folders"));
	return refs;
}

/** References pointing at one id. */
export const getReferrers = (map, id) => getReferences(map).filter(ref => ref.id === id);

const OPTIONAL_LISTS = new Set(["partOf", "resources", "reliesOn"]);

/** Removes one reference from its owner: array entries are dropped (optional lists go once empty), single ids are deleted. */
function removeReference(index, { owner, field }, id) {
	const path = field.split(".");
	const container = path.slice(0, -1).reduce((obj, key) => obj?.[key], index[owner]);
	const key = path.at(-1);
	if (!container) return;
	if (Array.isArray(container[key])) {
		container[key] = container[key].filter(value => value !== id);
		if (OPTIONAL_LISTS.has(key) && !container[key].length) delete container[key];
	} else delete container[key];
}

/** Deletes an actor, test or decision and every reference to it. */
export function deleteItem(map, id) {
	const index = createIndex(map);
	for (const ref of getReferrers(map, id)) removeReference(index, ref, id);
	const kind = getItemKind(id);
	map[kind.key] = map[kind.key].filter(item => item.id !== id);
}

/** Adds a test, to be verified against. */
export function createTest(map, label) {
	const test = { id: getNextId("T", map.tests), label: label || "Untitled test", summary: "", type: "", location: "" };
	map.tests.push(test);
	return test;
}

/** Adds an actor. */
export function createActor(map, label) {
	const actor = { id: getNextId("ACT", map.actors), label: label || "Untitled actor", summary: "" };
	map.actors.push(actor);
	return actor;
}

/** Adds a decision. */
export function createDecision(map, label) {
	const decision = { id: getNextId("D", map.decisions), label: label || "Untitled decision", summary: "", references: [] };
	map.decisions.push(decision);
	return decision;
}

/** Adds a new, untitled component to the map. */
export function createComponent(map, folderId) {
	const component = { id: getNextId("COM", map.components), label: "Untitled component", summary: "", depth: "", level: "high-level", specs: {} };
	if (folderId) component.folder = folderId;
	map.components.push(component);
	return component;
}

/** Adds a new folder to the map, optionally nested in another. */
export function createFolder(map, parentId) {
	const folder = { id: getNextId("FOL", map.folders), label: "New folder" };
	if (parentId) folder.parent = parentId;
	map.folders.push(folder);
	return folder;
}

/** Adds a new "uses" relation between two components. */
export function createRelation(map, from, to) {
	const relation = { id: getNextId("REL", map.relations), label: UNTITLED_RELATION, summary: "", kind: "uses", from, to };
	map.relations.push(relation);
	return relation;
}

/** Creates a spec (or resource) of a kind and attaches it to a component. */
export function createSpec(map, component, kind, label) {
	const required = {
		requirements: { verifiedBy: [] },
		useCases: { actors: [], steps: [], verifiedBy: [] },
		interfaces: { verifiedBy: [] },
		resources: { type: "", location: "" },
	}[kind.key];
	const spec = { id: getNextId(kind.prefix, map[kind.key]), label: label || `Untitled ${kind.one}`, summary: "", ...required };
	map[kind.key].push(spec);
	attachToComponent(component, kind, spec.id);
	return spec;
}

/** The component list a kind lives in: `specs.<kind>` for specs, `resources` for resources. */
export function getComponentSlot(component, kind) {
	if (kind.key === "resources") return (component.resources ??= []);
	component.specs ??= {};
	return (component.specs[kind.key] ??= []);
}

/** Lists an existing spec or resource on a component. */
export function attachToComponent(component, kind, id) {
	const slot = getComponentSlot(component, kind);
	if (!slot.includes(id)) slot.push(id);
}

/** Removes a resource from a component's resources (the resource stays in the map). */
export const detachResource = (component, resourceId) => removeFromOptionalList(component, "resources", resourceId);

/** Adds the spec to what a relation relies on, or removes it when already there. */
export function toggleReliesOn(relation, specId) {
	if (relation.reliesOn?.includes(specId)) removeFromOptionalList(relation, "reliesOn", specId);
	else addToOptionalList(relation, "reliesOn", specId);
}

/** Whether a relation was just created and never filled in, so deleting it loses nothing. */
export const isUntouchedRelation = relation => !relation.reliesOn?.length && relation.label === UNTITLED_RELATION && !relation.summary && !relation.notes;

/** Swaps a relation's source and target. */
export function flipRelation(relation) {
	[relation.from, relation.to] = [relation.to, relation.from];
}

/** Makes `child` part of `parent`, when that keeps containment acyclic. Tells whether it did. */
export function addPartOf(index, childId, parentId) {
	if (!canAddParent(index, childId, parentId)) return false;
	addToOptionalList(index[childId], "partOf", parentId);
	return true;
}

/** Removes `child` from `parent`. */
export const removePartOf = (index, childId, parentId) => removeFromOptionalList(index[childId], "partOf", parentId);

/** Turns "child part of parent" into "parent part of child", unless that would create a cycle. Tells whether it did. */
export function swapPartOf(index, childId, parentId) {
	removePartOf(index, childId, parentId);
	if (addPartOf(index, parentId, childId)) return true;
	addToOptionalList(index[childId], "partOf", parentId);
	return false;
}

/** Moves a component right before another in the list, taking the target's folder. */
export function moveComponentBefore(map, moving, target) {
	if (target.folder) moving.folder = target.folder;
	else delete moving.folder;
	map.components.splice(map.components.indexOf(moving), 1);
	map.components.splice(map.components.indexOf(target), 0, moving);
}

/** What deleting a component also touches. */
export function getComponentDeletionImpact(map, componentId) {
	const component = map.components.find(c => c.id === componentId);
	return {
		relations: map.relations.filter(r => r.from === componentId || r.to === componentId),
		children: getChildren(map, componentId),
		decisions: map.decisions.filter(d => d.references?.includes(componentId)),
		specCount: Object.values(component?.specs ?? {}).reduce((sum, list) => sum + (list?.length ?? 0), 0),
	};
}

/** Deletes a component with its relations, and removes it from children's `partOf` and from decisions. Its specs stay in the map. */
export function deleteComponent(map, componentId) {
	const { relations, children, decisions } = getComponentDeletionImpact(map, componentId);
	map.relations = map.relations.filter(r => !relations.includes(r));
	for (const child of children) removeFromOptionalList(child, "partOf", componentId);
	for (const decision of decisions) removeItem(decision.references, componentId);
	map.components = map.components.filter(c => c.id !== componentId);
}

/** What deleting a folder moves: its components and subfolders go to its parent. */
export const getFolderDeletionImpact = (map, folderId) => ({
	components: map.components.filter(c => c.folder === folderId),
	subfolders: map.folders.filter(f => f.parent === folderId),
});

/** Deletes a folder, moving its content one level up. */
export function deleteFolder(map, folderId) {
	const folder = map.folders.find(f => f.id === folderId);
	const { components, subfolders } = getFolderDeletionImpact(map, folderId);
	for (const component of components) folder.parent ? (component.folder = folder.parent) : delete component.folder;
	for (const subfolder of subfolders) folder.parent ? (subfolder.parent = folder.parent) : delete subfolder.parent;
	map.folders = map.folders.filter(f => f.id !== folderId);
}

/** What deleting a spec or resource also touches. */
export function getSpecDeletionImpact(map, itemId) {
	const holders = getHolders(map, itemId);
	return {
		holders,
		otherHolders: LISTS.filter(list => list !== "components").flatMap(list => map[list]).filter(item => item.resources?.includes(itemId)),
		relations: map.relations.filter(r => r.reliesOn?.includes(itemId)),
		verified: SPEC_KINDS.flatMap(kind => map[kind.key]).filter(spec => spec.verifiedBy?.includes(itemId)),
		decisions: map.decisions.filter(d => d.references?.includes(itemId)),
	};
}

/** Deletes a spec or resource and every reference to it. */
export function deleteSpec(map, kind, itemId) {
	const { holders, otherHolders, relations, verified, decisions } = getSpecDeletionImpact(map, itemId);
	for (const holder of holders) {
		for (const key of Object.keys(holder.specs ?? {})) removeItem(holder.specs[key], itemId);
		removeFromOptionalList(holder, "resources", itemId);
	}
	for (const holder of otherHolders) removeFromOptionalList(holder, "resources", itemId);
	for (const relation of relations) removeFromOptionalList(relation, "reliesOn", itemId);
	for (const spec of verified) removeItem(spec.verifiedBy, itemId);
	for (const decision of decisions) removeItem(decision.references, itemId);
	map[kind.key] = map[kind.key].filter(item => item.id !== itemId);
}

/** Deletes a relation and drops it from decisions. */
export function deleteRelation(map, relationId) {
	map.relations = map.relations.filter(r => r.id !== relationId);
	for (const decision of map.decisions) removeItem(decision.references, relationId);
}
