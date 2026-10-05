import { escapeHtml as esc, highlightMatches } from "../lib/format.js";
import { searchItems } from "../lib/search.js";
import { icon, isTyping, refreshIcons } from "./dom.js";

/**
 * Search box in the top bar: full-text search over every item, opening the picked item's page.
 * Ctrl/Cmd+K or "/" focuses it; arrows move through results, Enter opens, Escape leaves.
 */
export function createSearch({ doc, onOpen }) {
	const input = document.getElementById("search");
	const results = document.getElementById("searchResults");
	let hits = [], active = 0;

	/** Renders the result list for the current query. */
	function draw() {
		hits = searchItems(doc.map, input.value);
		active = Math.min(active, Math.max(0, hits.length - 1));
		results.hidden = !input.value.trim();
		const mark = text => highlightMatches(text, input.value);
		results.innerHTML = hits.map((hit, i) => `<div class="sr ${i === active ? "on" : ""}" data-i="${i}">
				${icon(hit.kind?.icon ?? "circle", 15)}<span class="pill">${mark(hit.item.id)}</span>
				<span class="sr-main"><span class="sr-label">${mark(hit.item.label || "Untitled")}</span>
				<span class="sr-sub">${mark(hit.snippet ?? hit.item.summary ?? "")}</span></span>
				<span class="sr-kind">${esc(hit.kind?.one ?? "")}</span></div>`).join("") || `<div class="empty">No matches</div>`;
		refreshIcons();
	}

	/** Opens a result and clears the search. */
	function pick(i) {
		const hit = hits[i];
		if (!hit) return;
		input.value = "";
		results.hidden = true;
		input.blur();
		onOpen(hit.item.id);
	}

	/** Moves the highlighted result. */
	function move(step) {
		if (!hits.length) return;
		active = (active + step + hits.length) % hits.length;
		draw();
		results.querySelector(".sr.on")?.scrollIntoView({ block: "nearest" });
	}

	input.addEventListener("input", () => { active = 0; draw(); });
	input.addEventListener("focus", () => { if (input.value.trim()) draw(); });
	input.addEventListener("keydown", event => {
		if (event.key === "ArrowDown") { event.preventDefault(); move(1); }
		else if (event.key === "ArrowUp") { event.preventDefault(); move(-1); }
		else if (event.key === "Enter") { event.preventDefault(); pick(active); }
		else if (event.key === "Escape") { input.value = ""; results.hidden = true; input.blur(); }
	});
	results.addEventListener("mousedown", event => {
		const row = event.target.closest(".sr");
		if (!row) return;
		event.preventDefault();
		pick(Number(row.dataset.i));
	});
	document.addEventListener("mousedown", event => { if (!event.target.closest(".search")) results.hidden = true; });
	addEventListener("keydown", event => {
		const shortcut = ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") || (event.key === "/" && !isTyping());
		if (!shortcut) return;
		event.preventDefault();
		input.focus();
		input.select();
	});
}
