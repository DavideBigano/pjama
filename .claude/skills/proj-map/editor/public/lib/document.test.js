import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createDocument } from "./document.js";

describe("createDocument", () => {
	test("starts clean", () => {
		const doc = createDocument({ map: { label: "A", components: [] } });
		assert.equal(doc.isDirty(), false);
	});
	test("adds lists missing from a hand-written map", () => {
		const doc = createDocument({ map: { label: "A", components: [] } });
		assert.deepEqual(doc.map.decisions, []);
	});
	test("is dirty after an edit", () => {
		const doc = createDocument({ map: { label: "A", components: [] } });
		doc.map.label = "B";
		assert.equal(doc.isDirty(), true);
	});
	test("is clean again once saved", () => {
		const doc = createDocument({ map: { label: "A", components: [] } });
		doc.map.label = "B";
		doc.markSaved("v2");
		assert.equal(doc.isDirty(), false);
	});
	test("indexes items by id", () => {
		const doc = createDocument({ map: { components: [{ id: "COM-001", specs: {} }] } });
		assert.equal(doc.index["COM-001"], doc.map.components[0]);
	});
	test("replace swaps in the fresh map", () => {
		const doc = createDocument({ map: { label: "A", components: [] }, version: "v1" });
		doc.replace({ map: { label: "Fresh", components: [] }, version: "v2", exists: true });
		assert.equal(doc.map.label, "Fresh");
	});
	test("replace adopts the fresh version", () => {
		const doc = createDocument({ map: { label: "A", components: [] }, version: "v1" });
		doc.replace({ map: { label: "Fresh", components: [] }, version: "v2", exists: true });
		assert.equal(doc.version, "v2");
	});
	test("replace leaves the document clean", () => {
		const doc = createDocument({ map: { label: "A", components: [] }, version: "v1" });
		doc.map.label = "edited";
		doc.replace({ map: { label: "Fresh", components: [] }, version: "v2", exists: true });
		assert.equal(doc.isDirty(), false);
	});
	test("keeps saved node positions", () => {
		const doc = createDocument({ map: { components: [] }, layout: { positions: { "COM-001": [1, 2] } } });
		assert.deepEqual(doc.positions, { "COM-001": [1, 2] });
	});
});
