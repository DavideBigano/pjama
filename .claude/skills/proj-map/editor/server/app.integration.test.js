import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { createHandler } from "./app.js";
import { createMapStore } from "./store.js";

/** Starts the handler on a free port over a temporary project; returns its base URL and a closer. */
async function startServer(files = {}) {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "projmap-app-"));
	for (const [name, content] of Object.entries(files)) {
		await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
		await fs.writeFile(path.join(root, name), content);
	}
	const mapPath = path.join(root, ".projMap/projMap.json");
	const store = createMapStore({ fs, mapPath, layoutPath: path.join(root, ".projMap/projMap.layout.json"), createMap: () => ({ label: "blank", components: [] }) });
	const publicDir = path.join(root, "public");
	await fs.mkdir(publicDir, { recursive: true });
	await fs.writeFile(path.join(publicDir, "index.html"), "<!doctype html>editor");
	const server = http.createServer(createHandler({ store, fs, publicDir, root, mapPath }));
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	return { url: `http://127.0.0.1:${server.address().port}`, root, mapPath, close: () => server.close() };
}

describe("editor server", () => {
	test("serves the app at /", async () => {
		const server = await startServer();
		const body = await (await fetch(server.url + "/")).text();
		server.close();
		assert.equal(body, "<!doctype html>editor");
	});
	test("loads the map with its version", async () => {
		const server = await startServer({ ".projMap/projMap.json": `{"label":"A","components":[]}` });
		const data = await (await fetch(server.url + "/api/map")).json();
		server.close();
		assert.equal(typeof data.version, "string");
	});
	test("saves the map to disk", async () => {
		const server = await startServer();
		await fetch(server.url + "/api/map", { method: "PUT", body: JSON.stringify({ map: { label: "Saved", components: [] }, baseVersion: null }) });
		const saved = JSON.parse(await fs.readFile(server.mapPath, "utf8"));
		server.close();
		assert.equal(saved.label, "Saved");
	});
	test("answers 409 when the file changed since it was loaded", async () => {
		const server = await startServer({ ".projMap/projMap.json": `{"label":"A","components":[]}` });
		const response = await fetch(server.url + "/api/map", { method: "PUT", body: JSON.stringify({ map: { label: "B", components: [] }, baseVersion: "stale" }) });
		server.close();
		assert.equal(response.status, 409);
	});
	test("rejects a body that isn't a map", async () => {
		const server = await startServer();
		const response = await fetch(server.url + "/api/map", { method: "PUT", body: JSON.stringify({ map: [1, 2] }) });
		server.close();
		assert.equal(response.status, 400);
	});
	test("serves resource files from the project root", async () => {
		const server = await startServer({ "docs/a.svg": "<svg/>" });
		const response = await fetch(server.url + "/files/docs/a.svg");
		server.close();
		assert.equal(response.headers.get("content-type"), "image/svg+xml");
	});
	test("refuses files outside the project root", async () => {
		const server = await startServer();
		const response = await fetch(server.url + "/files/..%2F..%2Fetc%2Fpasswd");
		server.close();
		assert.equal(response.status, 403);
	});
});
