import path from "node:path";

const CONTENT_TYPES = {
	".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
	".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif", ".bmp": "image/bmp",
	".ico": "image/x-icon", ".pdf": "application/pdf", ".md": "text/markdown; charset=utf-8", ".txt": "text/plain; charset=utf-8",
};

/** Content type for a file name, by extension. */
export const getContentType = file => CONTENT_TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";

/**
 * Absolute path of a requested file when it lies inside `root`, otherwise null.
 * Relative requests resolve against `root`; absolute ones are accepted only when inside it.
 */
export function resolveInsideRoot(root, requested) {
	let decoded;
	try { decoded = decodeURIComponent(requested); } catch { return null; }
	if (decoded.includes("\0")) return null;
	const absolute = path.isAbsolute(decoded) ? path.normalize(decoded) : path.join(root, decoded);
	const relative = path.relative(root, absolute);
	return relative.startsWith("..") || path.isAbsolute(relative) ? null : absolute;
}
