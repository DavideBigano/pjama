import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getSnippet, searchItems } from "./search.js";

describe("searchItems", () => {
	test("finds nothing for an empty query", () => {
		assert.deepEqual(searchItems({ components: [{ id: "COM-001", label: "A" }] }, "  "), []);
	});
	test("ranks an id match above a label match", () => {
		const map = { requirements: [{ id: "REQ-001", label: "Mentions COM-002" }], components: [{ id: "COM-002", label: "Web" }] };
		assert.deepEqual(searchItems(map, "com-002").map(r => r.item.id), ["COM-002", "REQ-001"]);
	});
	test("ranks a label match above a summary match", () => {
		const map = { components: [{ id: "COM-001", label: "Shop", summary: "orders" }, { id: "COM-002", label: "Orders API", summary: "" }] };
		assert.deepEqual(searchItems(map, "orders").map(r => r.item.id), ["COM-002", "COM-001"]);
	});
	test("finds text in nested fields, with a snippet", () => {
		const map = { useCases: [{ id: "UC-001", label: "Checkout", summary: "", steps: [{ action: "Customer submits the cart" }] }] };
		assert.equal(searchItems(map, "submits")[0].snippet, "Customer submits the cart");
	});
	test("matches every word spread over different fields", () => {
		const map = { components: [{ id: "COM-001", label: "Orders API", summary: "Runs on Fastify" }] };
		assert.equal(searchItems(map, "orders fastify")[0].rank, 4);
	});
	test("puts fields starting with the query first within a rank", () => {
		const map = { components: [{ id: "COM-001", label: "Web app" }, { id: "COM-002", label: "App gateway" }] };
		assert.equal(searchItems(map, "app")[0].item.id, "COM-002");
	});
	test("caps the result count", () => {
		const map = { components: Array.from({ length: 30 }, (_, i) => ({ id: `COM-${String(i).padStart(3, "0")}`, label: "Same" })) };
		assert.equal(searchItems(map, "same", 5).length, 5);
	});
});

describe("getSnippet", () => {
	test("trims long text around the match", () => {
		assert.equal(getSnippet("a".repeat(50) + "needle" + "b".repeat(50), "needle", 4), "…aaaaneedlebbbb…");
	});
});
