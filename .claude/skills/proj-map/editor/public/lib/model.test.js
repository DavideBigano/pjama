import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	SPEC_KINDS, canAddParent, createActor, createComponent, createTest, deleteItem, getItemKind, createIndex, createSpec, deleteComponent, deleteFolder, deleteSpec, getAncestors,
	getNextId, getSpecCards, getUnverifiedSpecs, isUntouchedRelation, moveComponentBefore, swapPartOf, toggleReliesOn,
} from "./model.js";

describe("getNextId", () => {
	test("continues after the highest id", () => {
		assert.equal(getNextId("COM", [{ id: "COM-002" }, { id: "COM-007" }]), "COM-008");
	});
	test("starts at 001 on an empty list", () => {
		assert.equal(getNextId("REQ", []), "REQ-001");
	});
});

describe("getAncestors", () => {
	test("walks parents of parents, nearest first", () => {
		const map = { components: [{ id: "COM-001" }, { id: "COM-002", partOf: ["COM-001"] }, { id: "COM-003", partOf: ["COM-002"] }] };
		const index = createIndex(map);
		assert.deepEqual(getAncestors(index, index["COM-003"]).map(c => c.id), ["COM-002", "COM-001"]);
	});
	test("terminates on a containment cycle", () => {
		const map = { components: [{ id: "COM-001", partOf: ["COM-002"] }, { id: "COM-002", partOf: ["COM-001"] }] };
		const index = createIndex(map);
		assert.deepEqual(getAncestors(index, index["COM-001"]).map(c => c.id), ["COM-002", "COM-001"]);
	});
});

describe("canAddParent", () => {
	test("allows an unrelated component", () => {
		const index = createIndex({ components: [{ id: "COM-001" }, { id: "COM-002" }] });
		assert.equal(canAddParent(index, "COM-002", "COM-001"), true);
	});
	test("refuses a descendant, which would create a cycle", () => {
		const index = createIndex({ components: [{ id: "COM-001" }, { id: "COM-002", partOf: ["COM-001"] }] });
		assert.equal(canAddParent(index, "COM-001", "COM-002"), false);
	});
	test("refuses the component itself", () => {
		const index = createIndex({ components: [{ id: "COM-001" }] });
		assert.equal(canAddParent(index, "COM-001", "COM-001"), false);
	});
});

describe("getSpecCards", () => {
	test("lists only own specs when related is off", () => {
		const map = { components: [{ id: "COM-001", specs: { requirements: ["REQ-001"] } }, { id: "COM-002", partOf: ["COM-001"], specs: { requirements: ["REQ-002"] } }], relations: [], requirements: [{ id: "REQ-001" }, { id: "REQ-002" }] };
		const index = createIndex(map);
		assert.deepEqual(getSpecCards(map, index, index["COM-002"], "requirements", false).map(c => c.id), ["REQ-002"]);
	});
	test("inherits specs from every ancestor", () => {
		const map = { components: [{ id: "COM-001", specs: { requirements: ["REQ-001"] } }, { id: "COM-002", partOf: ["COM-001"], specs: {} }, { id: "COM-003", partOf: ["COM-002"], specs: {} }], relations: [], requirements: [{ id: "REQ-001" }] };
		const index = createIndex(map);
		assert.equal(getSpecCards(map, index, index["COM-003"], "requirements", true)[0].from.id, "COM-001");
	});
	test("picks up specs a relation relies on, one step away", () => {
		const map = { components: [{ id: "COM-001", specs: {} }, { id: "COM-002", specs: { interfaces: ["IF-001"] } }], relations: [{ id: "REL-001", from: "COM-001", to: "COM-002", kind: "calls", reliesOn: ["IF-001"] }], interfaces: [{ id: "IF-001" }] };
		const index = createIndex(map);
		assert.equal(getSpecCards(map, index, index["COM-001"], "interfaces", true)[0].via, "calls →");
	});
	test("doesn't follow relations two steps away", () => {
		const map = {
			components: [{ id: "COM-001", specs: {} }, { id: "COM-002", specs: {} }, { id: "COM-003", specs: { interfaces: ["IF-001"] } }],
			relations: [{ id: "REL-001", from: "COM-001", to: "COM-002", kind: "uses" }, { id: "REL-002", from: "COM-002", to: "COM-003", kind: "uses", reliesOn: ["IF-001"] }],
			interfaces: [{ id: "IF-001" }],
		};
		const index = createIndex(map);
		assert.deepEqual(getSpecCards(map, index, index["COM-001"], "interfaces", true), []);
	});
	test("shows a spec once, preferring its own copy", () => {
		const map = { components: [{ id: "COM-001", specs: { interfaces: ["IF-001"] } }, { id: "COM-002", specs: {} }], relations: [{ id: "REL-001", from: "COM-002", to: "COM-001", kind: "uses", reliesOn: ["IF-001"] }], interfaces: [{ id: "IF-001" }] };
		const index = createIndex(map);
		assert.deepEqual(getSpecCards(map, index, index["COM-001"], "interfaces", true), [{ id: "IF-001", from: null, via: null }]);
	});
});

describe("createSpec", () => {
	test("gives a use case every required field", () => {
		const map = { useCases: [] };
		const spec = createSpec(map, { specs: {} }, SPEC_KINDS[1]);
		assert.deepEqual(spec, { id: "UC-001", label: "Untitled use case", summary: "", actors: [], steps: [], verifiedBy: [] });
	});
	test("attaches the spec to the component", () => {
		const component = { specs: {} };
		createSpec({ requirements: [] }, component, SPEC_KINDS[0]);
		assert.deepEqual(component.specs.requirements, ["REQ-001"]);
	});
});

describe("createComponent", () => {
	test("adds a component with the schema's required fields", () => {
		const map = { components: [] };
		assert.deepEqual(createComponent(map), { id: "COM-001", label: "Untitled component", summary: "", depth: "", level: "high-level", specs: {} });
	});
});

describe("toggleReliesOn", () => {
	test("adds a spec", () => {
		const relation = {};
		toggleReliesOn(relation, "IF-001");
		assert.deepEqual(relation.reliesOn, ["IF-001"]);
	});
	test("drops the list once its last spec is removed", () => {
		const relation = { reliesOn: ["IF-001"] };
		toggleReliesOn(relation, "IF-001");
		assert.equal("reliesOn" in relation, false);
	});
});

describe("isUntouchedRelation", () => {
	test("is true for a fresh relation", () => {
		assert.equal(isUntouchedRelation({ label: "Untitled relation", summary: "" }), true);
	});
	test("is false once the relation relies on something", () => {
		assert.equal(isUntouchedRelation({ label: "Untitled relation", summary: "", reliesOn: ["IF-001"] }), false);
	});
});

describe("swapPartOf", () => {
	test("turns the child into the parent", () => {
		const index = createIndex({ components: [{ id: "COM-001" }, { id: "COM-002", partOf: ["COM-001"] }] });
		swapPartOf(index, "COM-002", "COM-001");
		assert.deepEqual(index["COM-001"].partOf, ["COM-002"]);
	});
	test("refuses when the parent is still an ancestor through another path", () => {
		const index = createIndex({ components: [{ id: "COM-001" }, { id: "COM-002", partOf: ["COM-001"] }, { id: "COM-003", partOf: ["COM-001", "COM-002"] }] });
		assert.equal(swapPartOf(index, "COM-003", "COM-001"), false);
	});
	test("leaves the map unchanged when refusing", () => {
		const index = createIndex({ components: [{ id: "COM-001" }, { id: "COM-002", partOf: ["COM-001"] }, { id: "COM-003", partOf: ["COM-001", "COM-002"] }] });
		swapPartOf(index, "COM-003", "COM-001");
		assert.deepEqual(index["COM-003"].partOf.toSorted(), ["COM-001", "COM-002"]);
	});
});

describe("moveComponentBefore", () => {
	test("reorders and takes the target's folder", () => {
		const map = { components: [{ id: "COM-001", folder: "FOL-001" }, { id: "COM-002" }] };
		moveComponentBefore(map, map.components[1], map.components[0]);
		assert.deepEqual(map.components, [{ id: "COM-002", folder: "FOL-001" }, { id: "COM-001", folder: "FOL-001" }]);
	});
});

describe("deleteComponent", () => {
	test("deletes the relations touching it", () => {
		const map = { components: [{ id: "COM-001", specs: {} }, { id: "COM-002", specs: {} }], relations: [{ id: "REL-001", from: "COM-001", to: "COM-002" }], decisions: [] };
		deleteComponent(map, "COM-001");
		assert.deepEqual(map.relations, []);
	});
	test("frees its children", () => {
		const map = { components: [{ id: "COM-001", specs: {} }, { id: "COM-002", partOf: ["COM-001"], specs: {} }], relations: [], decisions: [] };
		deleteComponent(map, "COM-001");
		assert.deepEqual(map.components, [{ id: "COM-002", specs: {} }]);
	});
	test("removes it from decisions", () => {
		const map = { components: [{ id: "COM-001", specs: {} }], relations: [], decisions: [{ id: "D-001", references: ["COM-001", "REQ-001"] }] };
		deleteComponent(map, "COM-001");
		assert.deepEqual(map.decisions[0].references, ["REQ-001"]);
	});
});

describe("deleteFolder", () => {
	test("moves its components to the parent folder", () => {
		const map = { folders: [{ id: "FOL-001" }, { id: "FOL-002", parent: "FOL-001" }], components: [{ id: "COM-001", folder: "FOL-002" }] };
		deleteFolder(map, "FOL-002");
		assert.equal(map.components[0].folder, "FOL-001");
	});
	test("moves top-level content to the top level", () => {
		const map = { folders: [{ id: "FOL-001" }, { id: "FOL-002", parent: "FOL-001" }], components: [] };
		deleteFolder(map, "FOL-001");
		assert.deepEqual(map.folders, [{ id: "FOL-002" }]);
	});
});

describe("deleteSpec", () => {
	const createMap = () => ({
		components: [{ id: "COM-001", specs: { interfaces: ["IF-001"] } }],
		relations: [{ id: "REL-001", from: "COM-002", to: "COM-001", reliesOn: ["IF-001"] }],
		requirements: [{ id: "REQ-001", verifiedBy: ["IF-001", "T-001"] }],
		useCases: [], interfaces: [{ id: "IF-001", verifiedBy: [] }], folders: [], actors: [], resources: [], tests: [], decisions: [],
	});
	test("removes it from its owner", () => {
		const map = createMap();
		deleteSpec(map, SPEC_KINDS[2], "IF-001");
		assert.deepEqual(map.components[0].specs.interfaces, []);
	});
	test("removes it from what relations rely on", () => {
		const map = createMap();
		deleteSpec(map, SPEC_KINDS[2], "IF-001");
		assert.equal("reliesOn" in map.relations[0], false);
	});
	test("removes it from what other specs are verified by", () => {
		const map = createMap();
		deleteSpec(map, SPEC_KINDS[2], "IF-001");
		assert.deepEqual(map.requirements[0].verifiedBy, ["T-001"]);
	});
	test("removes it from its list", () => {
		const map = createMap();
		deleteSpec(map, SPEC_KINDS[2], "IF-001");
		assert.deepEqual(map.interfaces, []);
	});
});

describe("getUnverifiedSpecs", () => {
	test("lists specs with an empty verifiedBy, with their owner", () => {
		const map = { components: [{ id: "COM-001", specs: { requirements: ["REQ-002"] } }], requirements: [{ id: "REQ-001", verifiedBy: ["T-001"] }, { id: "REQ-002", verifiedBy: [] }], useCases: [], interfaces: [] };
		assert.deepEqual(getUnverifiedSpecs(map).map(item => [item.spec.id, item.owner.id]), [["REQ-002", "COM-001"]]);
	});
});

describe("getItemKind", () => {
	test("tells tests from other kinds by prefix", () => {
		assert.equal(getItemKind("T-004").key, "tests");
	});
	test("returns undefined for an unknown id", () => {
		assert.equal(getItemKind("XYZ-001"), undefined);
	});
});

describe("createTest", () => {
	test("adds a test with the schema's required fields", () => {
		const map = { tests: [{ id: "T-001" }] };
		assert.deepEqual(createTest(map, "Hash roundtrip"), { id: "T-002", label: "Hash roundtrip", summary: "", type: "", location: "" });
	});
});

describe("createActor", () => {
	test("adds an untitled actor when no label is given", () => {
		const map = { actors: [] };
		assert.equal(createActor(map).label, "Untitled actor");
	});
});

describe("deleteItem", () => {
	test("removes a test from what it verifies", () => {
		const map = { components: [], folders: [], relations: [], actors: [], requirements: [{ id: "REQ-001", verifiedBy: ["T-001", "UC-001"] }], useCases: [], interfaces: [], resources: [], tests: [{ id: "T-001" }], decisions: [] };
		deleteItem(map, "T-001");
		assert.deepEqual(map.requirements[0].verifiedBy, ["UC-001"]);
	});
	test("removes an actor from use cases, keeping the required list", () => {
		const map = { components: [], folders: [], relations: [], actors: [{ id: "ACT-001" }], requirements: [], useCases: [{ id: "UC-001", actors: ["ACT-001"] }], interfaces: [], resources: [], tests: [], decisions: [] };
		deleteItem(map, "ACT-001");
		assert.deepEqual(map.useCases[0].actors, []);
	});
	test("removes the item from its list", () => {
		const map = { components: [], folders: [], relations: [], actors: [], requirements: [], useCases: [], interfaces: [], resources: [], tests: [], decisions: [{ id: "D-001", references: [] }] };
		deleteItem(map, "D-001");
		assert.deepEqual(map.decisions, []);
	});
});
