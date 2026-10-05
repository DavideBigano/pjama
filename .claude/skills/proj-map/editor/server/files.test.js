import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getContentType, resolveInsideRoot } from "./files.js";

describe("resolveInsideRoot", () => {
	test("resolves a relative path against the root", () => {
		assert.equal(resolveInsideRoot("/repo", "docs/a.svg"), "/repo/docs/a.svg");
	});
	test("decodes URL-encoded segments", () => {
		assert.equal(resolveInsideRoot("/repo", "docs/my%20diagram.svg"), "/repo/docs/my diagram.svg");
	});
	test("refuses to climb out of the root", () => {
		assert.equal(resolveInsideRoot("/repo", "..%2F..%2Fetc%2Fpasswd"), null);
	});
	test("accepts an absolute path inside the root", () => {
		assert.equal(resolveInsideRoot("/repo", "/repo/docs/a.png"), "/repo/docs/a.png");
	});
	test("refuses an absolute path outside the root", () => {
		assert.equal(resolveInsideRoot("/repo", "/etc/passwd"), null);
	});
	test("refuses a sibling folder sharing the root's prefix", () => {
		assert.equal(resolveInsideRoot("/repo", "/repo-other/a.png"), null);
	});
});

describe("getContentType", () => {
	test("knows SVG", () => {
		assert.equal(getContentType("a.SVG"), "image/svg+xml");
	});
	test("falls back to a binary stream", () => {
		assert.equal(getContentType("a.unknown"), "application/octet-stream");
	});
});
