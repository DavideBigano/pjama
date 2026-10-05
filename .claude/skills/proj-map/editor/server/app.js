import path from "node:path";
import { getContentType, resolveInsideRoot } from "./files.js";
import { VersionConflict } from "./store.js";

const MAX_BODY_BYTES = 50 * 1024 * 1024;

/** Sends a JSON response. */
function sendJson(res, status, data) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
	res.end(JSON.stringify(data));
}

/** Reads and parses a JSON request body. */
async function readJsonBody(req) {
	let size = 0;
	const chunks = [];
	for await (const chunk of req) {
		size += chunk.length;
		if (size > MAX_BODY_BYTES) throw Object.assign(new Error("Request body too large"), { status: 413 });
		chunks.push(chunk);
	}
	try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
	catch { throw Object.assign(new Error("Request body isn't valid JSON"), { status: 400 }); }
}

/** Whether a value has the minimal shape of a map: an object with a components list. */
const looksLikeMap = map => !!map && typeof map === "object" && !Array.isArray(map) && Array.isArray(map.components);

/** Streams a file from disk, or answers 404. */
async function sendFile(res, fs, file) {
	try {
		const data = await fs.readFile(file);
		res.writeHead(200, { "content-type": getContentType(file), "cache-control": "no-store" });
		res.end(data);
	} catch {
		sendJson(res, 404, { error: "Not found" });
	}
}

/**
 * Request handler for the editor: the map API, resource files under `root` (at /files/...), and the
 * static app from `publicDir`. Dependencies are injected so it can run against a temporary folder.
 */
export function createHandler({ store, fs, publicDir, root, mapPath }) {
	const shownPath = path.relative(root, mapPath).startsWith("..") ? mapPath : path.relative(root, mapPath);
	const routes = {
		"GET /api/map": async (req, res) => {
			const [{ map, version, exists }, layout] = await Promise.all([store.read(), store.readLayout()]);
			sendJson(res, 200, { map, version, exists, layout, path: mapPath, shownPath });
		},
		"GET /api/version": async (req, res) => sendJson(res, 200, { version: await store.getCurrentVersion() }),
		"PUT /api/map": async (req, res) => {
			const { map, baseVersion = null, force = false } = await readJsonBody(req);
			if (!looksLikeMap(map)) return sendJson(res, 400, { error: "Body must hold a map with a components list" });
			sendJson(res, 200, { version: await store.write(map, baseVersion, force) });
		},
		"PUT /api/layout": async (req, res) => {
			const { layout } = await readJsonBody(req);
			await store.writeLayout(layout ?? { positions: {} });
			sendJson(res, 200, { ok: true });
		},
	};

	return async (req, res) => {
		const { pathname } = new URL(req.url, "http://localhost");
		try {
			const route = routes[`${req.method} ${pathname}`];
			if (route) return await route(req, res);
			if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });
			if (pathname.startsWith("/files/")) {
				const file = resolveInsideRoot(root, pathname.slice("/files/".length));
				return file ? sendFile(res, fs, file) : sendJson(res, 403, { error: "Outside the project root" });
			}
			const file = resolveInsideRoot(publicDir, pathname === "/" ? "index.html" : pathname.slice(1));
			return file ? sendFile(res, fs, file) : sendJson(res, 403, { error: "Forbidden" });
		} catch (error) {
			if (error instanceof VersionConflict) return sendJson(res, 409, { error: error.message, version: error.version });
			sendJson(res, error.status ?? 500, { error: error.message });
		}
	};
}
