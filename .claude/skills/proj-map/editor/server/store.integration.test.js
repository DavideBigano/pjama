import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { VersionConflict, createMapStore, getIndent } from "./store.js";

describe("createMapStore", () => {
	test("serves a blank map while the file is missing", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "projmap-"));
		const store = createMapStore({ fs, mapPath: path.join(dir, ".projMap/projMap.json"), layoutPath: path.join(dir, "l.json"), createMap: () => ({ label: "blank", components: [] }) });
		assert.deepEqual(await store.read(), { map: { label: "blank", components: [] }, version: null, exists: false });
	});
	test("creates the file and its folder on the first save", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "projmap-"));
		const mapPath = path.join(dir, ".projMap/projMap.json");
		const store = createMapStore({ fs, mapPath, layoutPath: path.join(dir, "l.json"), createMap: () => ({}) });
		await store.write({ label: "A", components: [] }, null);
		assert.deepEqual(JSON.parse(await fs.readFile(mapPath, "utf8")), { label: "A", components: [] });
	});
	test("refuses to overwrite a file that changed since it was read", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "projmap-"));
		const mapPath = path.join(dir, "projMap.json");
		await fs.writeFile(mapPath, "{}");
		const store = createMapStore({ fs, mapPath, layoutPath: path.join(dir, "l.json"), createMap: () => ({}) });
		const { version } = await store.read();
		await fs.writeFile(mapPath, `{"label":"agent"}`);
		await assert.rejects(store.write({ label: "mine" }, version), VersionConflict);
	});
	test("overwrites anyway when forced", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "projmap-"));
		const mapPath = path.join(dir, "projMap.json");
		await fs.writeFile(mapPath, `{"label":"agent"}`);
		const store = createMapStore({ fs, mapPath, layoutPath: path.join(dir, "l.json"), createMap: () => ({}) });
		await store.write({ label: "mine" }, "stale", true);
		assert.equal(JSON.parse(await fs.readFile(mapPath, "utf8")).label, "mine");
	});
	test("returns the version a later read reports", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "projmap-"));
		const store = createMapStore({ fs, mapPath: path.join(dir, "projMap.json"), layoutPath: path.join(dir, "l.json"), createMap: () => ({}) });
		const written = await store.write({ label: "A" }, null);
		assert.equal((await store.read()).version, written);
	});
	test("keeps the file's indentation", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "projmap-"));
		const mapPath = path.join(dir, "projMap.json");
		await fs.writeFile(mapPath, `{\n\t"label": "A"\n}\n`);
		const store = createMapStore({ fs, mapPath, layoutPath: path.join(dir, "l.json"), createMap: () => ({}) });
		await store.write({ label: "B" }, (await store.read()).version);
		assert.equal(await fs.readFile(mapPath, "utf8"), `{\n\t"label": "B"\n}\n`);
	});
	test("reports a file that isn't valid JSON", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "projmap-"));
		const mapPath = path.join(dir, "projMap.json");
		await fs.writeFile(mapPath, "{ nope");
		const store = createMapStore({ fs, mapPath, layoutPath: path.join(dir, "l.json"), createMap: () => ({}) });
		await assert.rejects(store.read(), /isn't valid JSON/);
	});
	test("round-trips the layout", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "projmap-"));
		const store = createMapStore({ fs, mapPath: path.join(dir, "projMap.json"), layoutPath: path.join(dir, "projMap.layout.json"), createMap: () => ({}) });
		await store.writeLayout({ positions: { "COM-001": [1, 2] } });
		assert.deepEqual(await store.readLayout(), { positions: { "COM-001": [1, 2] } });
	});
});

describe("getIndent", () => {
	test("defaults to two spaces", () => {
		assert.equal(getIndent(null), "  ");
	});
	test("detects tabs", () => {
		assert.equal(getIndent(`{\n\t"a": 1\n}`), "\t");
	});
});
