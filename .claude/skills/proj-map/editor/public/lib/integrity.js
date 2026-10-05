import { LISTS, createIndex, getReferences } from "./model.js";

const ID_PATTERNS = {
	components: /^COM-\d{3}$/, folders: /^FOL-\d{3}$/, relations: /^REL-\d{3}$/, actors: /^ACT-\d{3}$/,
	requirements: /^REQ-\d{3}$/, useCases: /^UC-\d{3}$/, interfaces: /^IF-\d{3}$/, resources: /^RES-\d{3}$/,
	tests: /^T-\d{3}$/, decisions: /^D-\d{3}$/,
};

/** Ids used by more than one item in the map. */
export function getDuplicateIds(map) {
	const counts = Map.groupBy(LISTS.flatMap(list => map[list] ?? []), item => item.id);
	return [...counts].filter(([, items]) => items.length > 1).map(([id]) => id);
}

/** Ids that don't match the pattern of the list they sit in. */
export const getMalformedIds = map =>
	LISTS.flatMap(list => (map[list] ?? []).filter(item => !ID_PATTERNS[list].test(item.id)).map(item => item.id));

/** References to ids that don't exist in the list they should point into. */
export function getDanglingReferences(map) {
	const listOf = Object.fromEntries(LISTS.flatMap(list => (map[list] ?? []).map(item => [item.id, list])));
	return getReferences(map).filter(ref => !ref.lists.includes(listOf[ref.id]));
}

/** Ids of items that reach themselves by following `parentsOf`. */
function getCycleMembers(items, parentsOf) {
	const byId = Object.fromEntries(items.map(item => [item.id, item]));
	const reachesItself = start => {
		const stack = [...parentsOf(byId[start])], seen = new Set();
		while (stack.length) {
			const id = stack.pop();
			if (id === start) return true;
			if (seen.has(id) || !byId[id]) continue;
			seen.add(id);
			stack.push(...parentsOf(byId[id]));
		}
		return false;
	};
	return items.map(item => item.id).filter(reachesItself);
}

/**
 * Problems JSON Schema can't catch: duplicate or malformed ids, dangling references, containment and
 * folder cycles, relations from a component to itself. Returns readable sentences (empty when sound).
 */
export function getIntegrityProblems(map) {
	const index = createIndex(map);
	return [
		...getDuplicateIds(map).map(id => `Id ${id} is used more than once`),
		...getMalformedIds(map).map(id => `Id ${id} doesn't match its list's pattern`),
		...getDanglingReferences(map).map(ref => `${ref.owner}.${ref.field} points to ${ref.id}, which doesn't exist${index[ref.id] ? " in the right list" : ""}`),
		...getCycleMembers(map.components, c => c.partOf ?? []).map(id => `${id} is part of itself through its parents`),
		...getCycleMembers(map.folders, f => (f.parent ? [f.parent] : [])).map(id => `Folder ${id} is nested in itself`),
		...map.relations.filter(r => r.from === r.to).map(r => `${r.id} goes from ${r.from} to itself`),
	];
}
