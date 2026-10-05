import { getAncestors } from "./model.js";

/** Radius of a graph node, in world units. */
export const NODE_RADIUS = 42;
/** How far apart parallel edges between the same two nodes bend. */
const PARALLEL_SPREAD = 44;
/** Share of the view kept as margin on each side when focusing (the 5/90/5 band). */
const BAND_MARGIN = 0.05;

/** Euclidean distance between two points. */
export const getDistance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Point at `t` on a quadratic Bézier curve. */
export const getBezierPoint = (p0, c, p2, t) => [
	(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p2[0],
	(1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p2[1],
];

/** Tangent at `t` on a quadratic Bézier curve. */
export const getBezierTangent = (p0, c, p2, t) => [
	2 * (1 - t) * (c[0] - p0[0]) + 2 * t * (p2[0] - c[0]),
	2 * (1 - t) * (c[1] - p0[1]) + 2 * t * (p2[1] - c[1]),
];

/**
 * Gives each edge its curve: lines run center to center, and edges between the same pair of nodes
 * (in either direction) bend apart symmetrically so none hides another. Returns new edge objects
 * with `p0` (start), `c` (control point) and `p2` (end).
 */
export function layoutEdges(edges, positions) {
	const groups = Map.groupBy(edges, edge => [edge.from, edge.to].sort().join("|"));
	return [...groups.values()].flatMap(group => {
		const [a, b] = [group[0].from, group[0].to].sort();
		const pa = positions[a], pb = positions[b], length = getDistance(pa, pb) || 1;
		const normal = [-(pb[1] - pa[1]) / length, (pb[0] - pa[0]) / length];
		return group.map((edge, i) => {
			const offset = (i - (group.length - 1) / 2) * PARALLEL_SPREAD * 2;
			const p0 = positions[edge.from], p2 = positions[edge.to];
			const middle = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2];
			return { ...edge, p0, p2, c: [middle[0] + normal[0] * offset, middle[1] + normal[1] * offset] };
		});
	});
}

/** SVG path data of a laid-out edge. */
export const getEdgePath = ({ p0, c, p2 }) => `M${p0[0]},${p0[1]} Q${c[0]},${c[1]} ${p2[0]},${p2[1]}`;

/** Where the curve enters the target node's border, with the unit direction it travels there. */
export function getArrowTip({ p0, c, p2 }, radius = NODE_RADIUS) {
	let low = 0.3, high = 1;
	for (let i = 0; i < 30; i++) {
		const middle = (low + high) / 2;
		if (getDistance(getBezierPoint(p0, c, p2, middle), p2) > radius) low = middle;
		else high = middle;
	}
	const point = getBezierPoint(p0, c, p2, low), tangent = getBezierTangent(p0, c, p2, low);
	const length = Math.hypot(...tangent) || 1;
	return { point, direction: [tangent[0] / length, tangent[1] / length] };
}

/** Polygon points of an arrowhead whose tip touches the target node's border. */
export function getArrowPoints(edge, radius = NODE_RADIUS) {
	const { point, direction: u } = getArrowTip(edge, radius), v = [-u[1], u[0]];
	const at = (back, side) => `${point[0] - u[0] * back + v[0] * side},${point[1] - u[1] * back + v[1] * side}`;
	return `${at(0, 0)} ${at(12, 5.5)} ${at(12, -5.5)}`;
}

/**
 * Offset, from the node center, for the node's id pill: outside the node, in the middle of the widest
 * angular gap between its edges and its nearby nodes (below the node when nothing is around).
 */
export function getPillOffset(id, edges, positions, radius = NODE_RADIUS) {
	const p = positions[id], angles = [];
	for (const edge of edges) if (edge.from === id || edge.to === id) angles.push(Math.atan2(edge.c[1] - p[1], edge.c[0] - p[0]));
	for (const [otherId, q] of Object.entries(positions))
		if (otherId !== id && getDistance(q, p) < radius * 6) angles.push(Math.atan2(q[1] - p[1], q[0] - p[0]));
	let angle = Math.PI / 2;
	if (angles.length) {
		angles.sort((x, y) => x - y);
		let widest = -1;
		angles.forEach((x, i) => {
			const next = angles[i + 1] ?? angles[0] + 2 * Math.PI;
			if (next - x > widest) { widest = next - x; angle = x + (next - x) / 2; }
		});
	}
	const u = [Math.cos(angle), Math.sin(angle)];
	const distance = radius + 6 + Math.abs(u[0]) * 27 + Math.abs(u[1]) * 8;
	return [u[0] * distance, u[1] * distance];
}

/** Box `[left, top, right, bottom]` around a node, room for its pill included. */
export const getNodeBox = ([x, y], radius = NODE_RADIUS) => [x - radius, y - radius, x + radius, y + radius + 18];

/** Smallest box containing every given box. */
export const getBoundingBox = boxes => [
	Math.min(...boxes.map(b => b[0])), Math.min(...boxes.map(b => b[1])),
	Math.max(...boxes.map(b => b[2])), Math.max(...boxes.map(b => b[3])),
];

/** Screen point to world point, through the camera `{ x, y, k }`. */
export const toWorld = (camera, p) => [(p[0] - camera.x) / camera.k, (p[1] - camera.y) / camera.k];

/**
 * Camera that brings a box into view: the focus point is centered horizontally, and the view moves
 * vertically only as much as needed to keep the box inside the central 90% band. When the box can't
 * fit the band, the camera zooms out until it does and centers it.
 */
export function getFocusCamera(box, center, camera, [width, height]) {
	const band = 1 - 2 * BAND_MARGIN;
	const boxWidth = box[2] - box[0], boxHeight = box[3] - box[1];
	const fits = boxWidth * camera.k <= band * width && boxHeight * camera.k <= band * height;
	const k = fits ? camera.k : Math.min(band * width / boxWidth, band * height / boxHeight);
	const x = width / 2 - center[0] * k;
	if (!fits) return { x, y: height / 2 - center[1] * k, k };
	const top = box[1] * k + camera.y, bottom = box[3] * k + camera.y;
	let y = camera.y;
	if (top < BAND_MARGIN * height) y += BAND_MARGIN * height - top;
	else if (bottom > (1 - BAND_MARGIN) * height) y -= bottom - (1 - BAND_MARGIN) * height;
	return { x, y, k };
}

/** Camera that shows every box, centered, never zoomed in past 1.2. */
export function getFitCamera(boxes, [width, height]) {
	if (!boxes.length) return { x: width / 2, y: height / 2, k: 1 };
	const box = getBoundingBox(boxes), band = 1 - 2 * BAND_MARGIN;
	const k = Math.min(1.2, band * width / Math.max(1, box[2] - box[0]), band * height / Math.max(1, box[3] - box[1]));
	return { k, x: width / 2 - (box[0] + box[2]) / 2 * k, y: height / 2 - (box[1] + box[3]) / 2 * k };
}

/** Camera zoomed by `factor` around a screen point, clamped between 0.15 and 3. */
export function getZoomedCamera(camera, point, factor) {
	const k = Math.min(3, Math.max(0.15, camera.k * factor));
	return { x: point[0] - (point[0] - camera.x) * (k / camera.k), y: point[1] - (point[1] - camera.y) * (k / camera.k), k };
}

/**
 * How far to scroll the view per frame while linking, from the pointer's distance to the view's edges:
 * nothing outside a 48px margin, then a quadratic ramp up to 6px at the border.
 */
export function getAutoPanDelta([px, py], [width, height], margin = 48, speed = 6) {
	const ramp = x => Math.min(1, Math.max(0, x)) ** 2;
	const push = (v, max) => (v < margin ? ramp((margin - v) / margin) : v > max - margin ? -ramp((v - (max - margin)) / margin) : 0);
	return [push(px, width) * speed, push(py, height) * speed];
}

/** Nearest point to `p`, spiralling out, that keeps clear of every positioned node. */
export function findFreeSpot(p, positions, radius = NODE_RADIUS) {
	const isClear = q => Object.values(positions).every(other => getDistance(other, q) > radius * 3);
	for (let r = 0; r < 1200; r += radius)
		for (let degrees = 0; degrees < 360; degrees += r ? 30 : 360) {
			const q = [Math.round(p[0] + r * Math.cos(degrees * Math.PI / 180)), Math.round(p[1] + r * Math.sin(degrees * Math.PI / 180))];
			if (isClear(q)) return q;
		}
	return p;
}

/**
 * Positions for every component: known ones are kept, missing ones are placed in rows by containment
 * depth (top-level components first) at the nearest free spot.
 */
export function getInitialPositions(map, index, known) {
	const positions = Object.fromEntries(Object.entries(known).filter(([id]) => index[id]));
	const missing = map.components.filter(c => !positions[c.id]);
	const perRow = {};
	for (const component of missing) {
		const row = Math.min(4, getAncestors(index, component).length);
		const column = (perRow[row] = (perRow[row] ?? -1) + 1);
		positions[component.id] = findFreeSpot([140 + column * 180, 120 + row * 180], positions);
	}
	return positions;
}
