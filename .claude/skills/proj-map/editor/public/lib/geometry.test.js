import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	NODE_RADIUS, findFreeSpot, getArrowTip, getAutoPanDelta, getDistance, getFitCamera, getFocusCamera, getInitialPositions,
	getPillOffset, getZoomedCamera, layoutEdges,
} from "./geometry.js";
import { createIndex } from "./model.js";

describe("layoutEdges", () => {
	test("keeps a lone edge straight (control point on the midpoint)", () => {
		const [edge] = layoutEdges([{ from: "a", to: "b" }], { a: [0, 0], b: [100, 0] });
		assert.deepEqual(edge.c, [50, 0]);
	});
	test("bends two edges between the same nodes to opposite sides", () => {
		const edges = layoutEdges([{ from: "a", to: "b" }, { from: "b", to: "a" }], { a: [0, 0], b: [100, 0] });
		assert.equal(edges[0].c[1], -edges[1].c[1]);
	});
	test("doesn't let parallel edges overlap", () => {
		const edges = layoutEdges([{ from: "a", to: "b" }, { from: "a", to: "b" }], { a: [0, 0], b: [100, 0] });
		assert.notDeepEqual(edges[0].c, edges[1].c);
	});
	test("starts and ends edges at node centers", () => {
		const [edge] = layoutEdges([{ from: "a", to: "b" }], { a: [0, 0], b: [100, 40] });
		assert.deepEqual([edge.p0, edge.p2], [[0, 0], [100, 40]]);
	});
});

describe("getArrowTip", () => {
	test("puts the tip on the target node's border", () => {
		const { point } = getArrowTip({ p0: [0, 0], c: [100, 0], p2: [200, 0] });
		assert.ok(Math.abs(getDistance(point, [200, 0]) - NODE_RADIUS) < 0.01);
	});
});

describe("getPillOffset", () => {
	test("puts the pill below a node with nothing around", () => {
		const [x, y] = getPillOffset("a", [], { a: [0, 0] });
		assert.ok(Math.abs(x) < 1e-9 && y > NODE_RADIUS);
	});
	test("moves the pill away from a neighbour below", () => {
		const [, y] = getPillOffset("a", [], { a: [0, 0], b: [0, 100] });
		assert.ok(y < 0);
	});
});

describe("getFocusCamera", () => {
	test("centers the focus point horizontally", () => {
		const camera = getFocusCamera([90, 90, 110, 110], [100, 100], { x: 0, y: 0, k: 1 }, [1000, 800]);
		assert.equal(camera.x, 400);
	});
	test("doesn't move vertically when the box is already inside the band", () => {
		const camera = getFocusCamera([90, 300, 110, 320], [100, 310], { x: 0, y: 0, k: 1 }, [1000, 800]);
		assert.equal(camera.y, 0);
	});
	test("moves down just enough to bring a box near the top inside the band", () => {
		const camera = getFocusCamera([90, 0, 110, 20], [100, 10], { x: 0, y: 0, k: 1 }, [1000, 800]);
		assert.equal(camera.y, 40);
	});
	test("zooms out when the box can't fit the band", () => {
		const camera = getFocusCamera([0, 0, 2000, 100], [1000, 50], { x: 0, y: 0, k: 1 }, [1000, 800]);
		assert.equal(camera.k, 0.45);
	});
});

describe("getFitCamera", () => {
	test("never zooms in past 1.2", () => {
		assert.equal(getFitCamera([[0, 0, 10, 10]], [1000, 800]).k, 1.2);
	});
});

describe("getZoomedCamera", () => {
	test("keeps the point under the pointer fixed", () => {
		const camera = getZoomedCamera({ x: 10, y: 20, k: 1 }, [300, 200], 2);
		assert.deepEqual([(300 - camera.x) / camera.k, (200 - camera.y) / camera.k], [290, 180]);
	});
	test("clamps the zoom", () => {
		assert.equal(getZoomedCamera({ x: 0, y: 0, k: 2 }, [0, 0], 10).k, 3);
	});
});

describe("getAutoPanDelta", () => {
	test("doesn't scroll away from the edges", () => {
		assert.deepEqual(getAutoPanDelta([500, 400], [1000, 800]), [0, 0]);
	});
	test("scrolls at full speed right at the left border", () => {
		assert.deepEqual(getAutoPanDelta([0, 400], [1000, 800]), [6, 0]);
	});
	test("scrolls slowly when just entering the margin", () => {
		const [dx] = getAutoPanDelta([1000 - 40, 400], [1000, 800]);
		assert.ok(dx < 0 && dx > -1);
	});
});

describe("findFreeSpot", () => {
	test("keeps a point that's already clear", () => {
		assert.deepEqual(findFreeSpot([0, 0], { a: [1000, 1000] }), [0, 0]);
	});
	test("moves off an occupied point", () => {
		const spot = findFreeSpot([0, 0], { a: [0, 0] });
		assert.ok(getDistance(spot, [0, 0]) > NODE_RADIUS * 3);
	});
});

describe("getInitialPositions", () => {
	test("keeps known positions", () => {
		const map = { components: [{ id: "COM-001" }] };
		assert.deepEqual(getInitialPositions(map, createIndex(map), { "COM-001": [5, 6] }), { "COM-001": [5, 6] });
	});
	test("drops positions of deleted components", () => {
		const map = { components: [] };
		assert.deepEqual(getInitialPositions(map, createIndex(map), { "COM-009": [5, 6] }), {});
	});
	test("places children below their parents", () => {
		const map = { components: [{ id: "COM-001" }, { id: "COM-002", partOf: ["COM-001"] }] };
		const positions = getInitialPositions(map, createIndex(map), {});
		assert.ok(positions["COM-002"][1] > positions["COM-001"][1]);
	});
});
