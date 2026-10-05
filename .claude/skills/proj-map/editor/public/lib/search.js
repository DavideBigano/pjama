import { LISTS, getItemKind } from "./model.js";

/** Every string inside a value, at any depth. */
const collectStrings = (value, out = []) => {
	if (typeof value === "string") out.push(value);
	else if (value && typeof value === "object") for (const inner of Object.values(value)) collectStrings(inner, out);
	return out;
};

/** A short excerpt of `text` around the first match of `query`. */
export function getSnippet(text, query, radius = 32) {
	const at = text.toLowerCase().indexOf(query);
	if (at < 0) return text.slice(0, radius * 2);
	const start = Math.max(0, at - radius), end = Math.min(text.length, at + query.length + radius);
	return (start ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

/**
 * Full-text search over every item in the map. Results rank by where the query matches: id, then
 * label, then summary, then any other text (with a snippet), then items holding every word somewhere.
 * Within a rank, fields starting with the query come first.
 */
export function searchItems(map, query, limit = 20) {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	const words = q.split(/\s+/);
	const results = [];
	for (const list of LISTS) {
		for (const item of map[list] ?? []) {
			const { id, label = "", summary = "", ...rest } = item;
			const main = [id, label, summary].map(field => String(field ?? "").toLowerCase());
			const others = collectStrings(rest);
			let rank = main.findIndex(field => field.includes(q));
			let snippet = null, starts = rank >= 0 && main[rank].startsWith(q);
			if (rank < 0) {
				const hit = others.find(text => text.toLowerCase().includes(q));
				if (hit) { rank = 3; snippet = getSnippet(hit, q); starts = hit.toLowerCase().startsWith(q); }
			}
			if (rank < 0 && words.length > 1 && words.every(word => [...main, ...others.map(t => t.toLowerCase())].some(text => text.includes(word)))) rank = 4;
			if (rank >= 0) results.push({ item, kind: getItemKind(id), rank, starts, snippet });
		}
	}
	return results
		.sort((a, b) => a.rank - b.rank || b.starts - a.starts || String(a.item.label).length - String(b.item.label).length)
		.slice(0, limit);
}
