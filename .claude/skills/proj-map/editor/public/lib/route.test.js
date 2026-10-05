import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatRoute, parseRoute } from "./route.js";

describe("parseRoute", () => {
	test("reads view, component and card", () => {
		assert.deepEqual(parseRoute("#/list/COM-002:UC-001"), { view: "list", id: "COM-002", card: "UC-001" });
	});
	test("reads the graph view", () => {
		assert.equal(parseRoute("#/graph").view, "graph");
	});
	test("defaults to the list view for an empty or unknown hash", () => {
		assert.deepEqual(parseRoute(""), { view: "list", id: null, card: null });
	});
});

describe("formatRoute", () => {
	test("writes a hash parseRoute reads back", () => {
		const route = { view: "list", id: "COM-003", card: "REQ-004" };
		assert.deepEqual(parseRoute(formatRoute(route)), route);
	});
	test("omits the card when there's no id", () => {
		assert.equal(formatRoute({ view: "graph", card: "UC-001" }), "#/graph");
	});
});

describe("parseRoute (old links)", () => {
	test("reads #/components links as the list view", () => {
		assert.equal(parseRoute("#/components/COM-001").view, "list");
	});
});
