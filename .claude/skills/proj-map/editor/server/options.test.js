import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DEFAULT_PORT, getOptions } from "./options.js";

describe("getOptions", () => {
	test("defaults the map to .projMap/projMap.json under cwd", () => {
		assert.equal(getOptions([], "/repo").mapPath, "/repo/.projMap/projMap.json");
	});
	test("roots resource paths at the folder holding .projMap", () => {
		assert.equal(getOptions([], "/repo").root, "/repo");
	});
	test("roots resource paths at the map's folder for maps elsewhere", () => {
		assert.equal(getOptions(["docs/map.json"], "/repo").root, "/repo/docs");
	});
	test("keeps the layout next to the map", () => {
		assert.equal(getOptions(["docs/map.json"], "/repo").layoutPath, "/repo/docs/map.layout.json");
	});
	test("reads the port", () => {
		assert.equal(getOptions(["--port", "5000"], "/repo").port, 5000);
	});
	test("uses the default port otherwise", () => {
		assert.equal(getOptions([], "/repo").port, DEFAULT_PORT);
	});
	test("reads --open", () => {
		assert.equal(getOptions(["--open"], "/repo").open, true);
	});
});
