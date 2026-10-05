import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ConflictError, createApi } from "./api.js";

describe("createApi", () => {
	test("save sends the map with its base version", async () => {
		let sent;
		const api = createApi(async (path, init) => { sent = JSON.parse(init.body); return new Response(JSON.stringify({ version: "v2" })); });
		await api.save({ components: [] }, "v1");
		assert.deepEqual(sent, { map: { components: [] }, baseVersion: "v1", force: false });
	});
	test("save resolves to the new version", async () => {
		const api = createApi(async () => new Response(JSON.stringify({ version: "v2" })));
		assert.deepEqual(await api.save({ components: [] }, "v1"), { version: "v2" });
	});
	test("a 409 becomes a ConflictError carrying the version on disk", async () => {
		const api = createApi(async () => new Response(JSON.stringify({ version: "disk" }), { status: 409 }));
		await assert.rejects(api.save({ components: [] }, "v1"), error => error instanceof ConflictError && error.version === "disk");
	});
	test("other failures surface the server's message", async () => {
		const api = createApi(async () => new Response(JSON.stringify({ error: "broken" }), { status: 500 }));
		await assert.rejects(api.load(), { message: "broken" });
	});
});
