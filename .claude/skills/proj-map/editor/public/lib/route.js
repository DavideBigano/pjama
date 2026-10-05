/** Reads the location hash: "#/list/COM-002:UC-001" → `{ view: "list", id: "COM-002", card: "UC-001" }`. "#/components/…" still works. */
export function parseRoute(hash) {
	const [view, target = ""] = String(hash).replace(/^#\/?/, "").split("/");
	const [id, card] = target.split(":");
	return { view: view === "graph" ? "graph" : "list", id: id || null, card: card || null };
}

/** Writes a location hash for a view, optionally targeting an item (and a spec card on it). */
export const formatRoute = ({ view, id = null, card = null }) =>
	`#/${view}${id ? "/" + id + (card ? ":" + card : "") : ""}`;
