import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getDanglingReferences, getDuplicateIds, getIntegrityProblems, getMalformedIds } from "./integrity.js";

const LISTS = { components: [], folders: [], relations: [], actors: [], requirements: [], useCases: [], interfaces: [], resources: [], tests: [], decisions: [] };

describe("getIntegrityProblems", () => {
	test("finds nothing in a sound map", () => {
		const map = { ...LISTS, components: [{ id: "COM-001", specs: { requirements: ["REQ-001"] } }], requirements: [{ id: "REQ-001", verifiedBy: [] }] };
		assert.deepEqual(getIntegrityProblems(map), []);
	});
	test("reports a containment cycle", () => {
		const map = { ...LISTS, components: [{ id: "COM-001", partOf: ["COM-002"], specs: {} }, { id: "COM-002", partOf: ["COM-001"], specs: {} }] };
		assert.ok(getIntegrityProblems(map).includes("COM-001 is part of itself through its parents"));
	});
	test("reports a folder nested in itself", () => {
		const map = { ...LISTS, folders: [{ id: "FOL-001", parent: "FOL-001" }] };
		assert.ok(getIntegrityProblems(map).includes("Folder FOL-001 is nested in itself"));
	});
	test("reports a relation from a component to itself", () => {
		const map = { ...LISTS, components: [{ id: "COM-001", specs: {} }], relations: [{ id: "REL-001", from: "COM-001", to: "COM-001" }] };
		assert.ok(getIntegrityProblems(map).includes("REL-001 goes from COM-001 to itself"));
	});
});

describe("getDuplicateIds", () => {
	test("finds an id used twice across lists", () => {
		assert.deepEqual(getDuplicateIds({ ...LISTS, components: [{ id: "COM-001" }], tests: [{ id: "COM-001" }] }), ["COM-001"]);
	});
});

describe("getMalformedIds", () => {
	test("finds an id that doesn't match its list", () => {
		assert.deepEqual(getMalformedIds({ ...LISTS, requirements: [{ id: "REQ-1" }] }), ["REQ-1"]);
	});
});

describe("getDanglingReferences", () => {
	test("finds a reliesOn pointing to a missing spec", () => {
		const map = { ...LISTS, components: [{ id: "COM-001" }, { id: "COM-002" }], relations: [{ id: "REL-001", from: "COM-001", to: "COM-002", reliesOn: ["IF-009"] }] };
		assert.deepEqual(getDanglingReferences(map).map(ref => ref.id), ["IF-009"]);
	});
	test("finds a reference into the wrong list", () => {
		const map = { ...LISTS, components: [{ id: "COM-001", partOf: ["REQ-001"] }], requirements: [{ id: "REQ-001", verifiedBy: [] }] };
		assert.deepEqual(getDanglingReferences(map).map(ref => ref.field), ["partOf"]);
	});
	test("accepts a test or another spec in verifiedBy", () => {
		const map = { ...LISTS, requirements: [{ id: "REQ-001", verifiedBy: ["T-001", "UC-001"] }], tests: [{ id: "T-001" }], useCases: [{ id: "UC-001", verifiedBy: [], actors: [] }] };
		assert.deepEqual(getDanglingReferences(map), []);
	});
});
