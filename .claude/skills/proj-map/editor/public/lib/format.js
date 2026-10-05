/** Escapes text for safe interpolation into HTML markup and attributes. */
export const escapeHtml = value =>
	String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Capitalizes every word and splits camelCase: "availabilityAndReliability" → "Availability And Reliability". */
export const titleCase = value =>
	String(value)
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.split(/\s+/)
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");

/** "1 spec", "3 specs". */
export const pluralize = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Whether a resource location points to an image the browser can display. */
export const isImageLocation = location => /\.(png|jpe?g|gif|svg|webp|avif|bmp)([?#].*)?$/i.test(location || "");

/** Whether a location is a web URL rather than a file path. */
export const isWebUrl = location => /^[a-z][a-z0-9+.-]*:\/\//i.test(location || "");

/** URL the browser loads a resource from: web URLs as they are, file paths through the server's /files route. */
export const getResourceUrl = location =>
	isWebUrl(location) ? location : "/files/" + String(location).replaceAll("\\", "/").split("/").map(encodeURIComponent).join("/");

/** Wraps a label onto at most two short lines, so it fits inside a graph node. */
export function wrapNodeLabel(label, width = 11) {
	const lines = [""];
	for (const word of String(label || "Untitled").split(/\s+/)) {
		const current = lines.at(-1);
		if (!current || (current + " " + word).length <= width) lines[lines.length - 1] = current ? current + " " + word : word;
		else lines.push(word);
	}
	if (lines.length > 2) lines.splice(1, Infinity, lines[1] + "…");
	return lines.map(line => (line.length > width + 2 ? line.slice(0, width + 1) + "…" : line));
}

/** Escaped HTML of `text` with every occurrence of the query's words wrapped in <mark>, ignoring case. */
export function highlightMatches(text, query) {
	const words = [...new Set(String(query).trim().toLowerCase().split(/\s+/).filter(Boolean))];
	const source = String(text ?? "");
	if (!words.length) return escapeHtml(source);
	const pattern = new RegExp(words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length).join("|"), "gi");
	let html = "", last = 0;
	for (const match of source.matchAll(pattern)) {
		html += escapeHtml(source.slice(last, match.index)) + `<mark>${escapeHtml(match[0])}</mark>`;
		last = match.index + match[0].length;
	}
	return html + escapeHtml(source.slice(last));
}
