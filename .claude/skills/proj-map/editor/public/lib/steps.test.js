import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { addBranch, appendStep, countSteps, getStep, getStepRows, insertStepAfter, removeStep } from "./steps.js";

describe("getStep", () => {
	test("follows next and branch segments", () => {
		const steps = [{ action: "a", next: { action: "b", branches: [{ action: "b-alt" }] } }];
		assert.equal(getStep(steps, "0/n/b0").action, "b-alt");
	});
});

describe("getStepRows", () => {
	test("numbers the main flow across next links", () => {
		const steps = [{ action: "a", next: { action: "b" } }];
		assert.deepEqual(getStepRows(steps).map(row => row.number), ["1", "2"]);
	});
	test("numbers branches under their step, indented", () => {
		const steps = [{ action: "a", next: { action: "b", branches: [{ action: "x", next: { action: "y" } }] } }];
		assert.deepEqual(getStepRows(steps).map(row => [row.number, row.depth]), [["1", 0], ["2", 0], ["2a.1", 1], ["2a.2", 1]]);
	});
	test("lists a branch before the step that follows its fork", () => {
		const steps = [{ action: "a", branches: [{ action: "x" }], next: { action: "b" } }];
		assert.deepEqual(getStepRows(steps).map(row => row.step.action), ["a", "x", "b"]);
	});
	test("continues numbering across root steps", () => {
		const steps = [{ action: "a" }, { action: "b" }];
		assert.deepEqual(getStepRows(steps).map(row => row.number), ["1", "2"]);
	});
});

describe("insertStepAfter", () => {
	test("puts the new step between a step and its next", () => {
		const steps = [{ action: "a", next: { action: "c" } }];
		insertStepAfter(steps, "0", "b");
		assert.deepEqual(steps, [{ action: "a", next: { action: "b", next: { action: "c" } } }]);
	});
});

describe("addBranch", () => {
	test("returns the path of the new branch", () => {
		const steps = [{ action: "a", branches: [{ action: "x" }] }];
		assert.equal(addBranch(steps, "0", "y"), "0/b1");
	});
});

describe("appendStep", () => {
	test("starts an empty list", () => {
		const steps = [];
		appendStep(steps, "a");
		assert.deepEqual(steps, [{ action: "a" }]);
	});
	test("chains onto the end of the main flow", () => {
		const steps = [{ action: "a", next: { action: "b" } }];
		assert.equal(appendStep(steps, "c"), "0/n/n");
	});
});

describe("removeStep", () => {
	test("moves the following step up", () => {
		const steps = [{ action: "a", next: { action: "b", next: { action: "c" } } }];
		removeStep(steps, "0/n");
		assert.deepEqual(steps, [{ action: "a", next: { action: "c" } }]);
	});
	test("removes a last root step from the list", () => {
		const steps = [{ action: "a" }];
		removeStep(steps, "0");
		assert.deepEqual(steps, []);
	});
	test("drops the branches list once its last branch is gone", () => {
		const steps = [{ action: "a", branches: [{ action: "x" }] }];
		removeStep(steps, "0/b0");
		assert.deepEqual(steps, [{ action: "a" }]);
	});
});

describe("countSteps", () => {
	test("counts steps in every flow", () => {
		assert.equal(countSteps([{ action: "a", next: { action: "b", branches: [{ action: "x" }] } }]), 3);
	});
});
