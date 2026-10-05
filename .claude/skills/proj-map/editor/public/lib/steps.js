/*
 * A use case's steps form a tree: the `steps` list runs in order, each step continues through `next`,
 * and alternative flows fork off through `branches`. A step is addressed by a path such as "1/n/b0":
 * the root index, then "n" for each `next` and "b<j>" for branch j.
 */

/** The object holding a step and the key it sits under. */
function locate(steps, path) {
	const [root, ...segments] = path.split("/");
	let holder = steps, key = Number(root);
	for (const segment of segments) {
		const current = holder[key];
		if (segment === "n") { holder = current; key = "next"; }
		else { holder = current.branches; key = Number(segment.slice(1)); }
	}
	return { holder, key };
}

/** The step at a path. */
export function getStep(steps, path) {
	const { holder, key } = locate(steps, path);
	return holder?.[key];
}

/** Inserts a step right after another, in the same flow; returns its path. */
export function insertStepAfter(steps, path, action = "") {
	const step = getStep(steps, path);
	const created = { action };
	if (step.next) created.next = step.next;
	step.next = created;
	return `${path}/n`;
}

/** Forks an alternative flow off a step; returns the path of its first step. */
export function addBranch(steps, path, action = "") {
	const step = getStep(steps, path);
	step.branches ??= [];
	step.branches.push({ action });
	return `${path}/b${step.branches.length - 1}`;
}

/** Adds a step at the end of the main flow; returns its path. */
export function appendStep(steps, action = "") {
	if (!steps.length) {
		steps.push({ action });
		return "0";
	}
	let path = String(steps.length - 1);
	while (getStep(steps, path).next) path += "/n";
	return insertStepAfter(steps, path, action);
}

/** Removes a step; what followed it moves up, its branches go with it. */
export function removeStep(steps, path) {
	const { holder, key } = locate(steps, path);
	const step = holder[key];
	if (step.next) holder[key] = step.next;
	else if (Array.isArray(holder)) holder.splice(key, 1);
	else delete holder[key];
	const segments = path.split("/");
	const parentPath = segments.slice(0, -1).join("/");
	if (segments.at(-1).startsWith("b") && !holder.length) delete getStep(steps, parentPath).branches;
}

/** Number of steps in the whole tree. */
export const countSteps = steps =>
	steps.reduce((sum, step) => sum + (step ? 1 + countSteps(step.next ? [step.next] : []) + countSteps(step.branches ?? []) : 0), 0);

/** Lists a flow and its branches in display order, numbering steps "1", "2", "2a.1", "2a.2"… */
function walkFlow(step, path, depth, prefix, number, rows) {
	for (let current = step, at = path; current; current = current.next, at += "/n", number++) {
		const label = prefix + number;
		rows.push({ path: at, step: current, depth, number: label });
		(current.branches ?? []).forEach((branch, j) => walkFlow(branch, `${at}/b${j}`, depth + 1, `${label}${String.fromCharCode(97 + j)}.`, 1, rows));
	}
	return number;
}

/** Every step as a display row `{ path, step, depth, number }`, in tree order. */
export function getStepRows(steps) {
	const rows = [];
	let number = 1;
	steps.forEach((step, i) => { number = walkFlow(step, String(i), 0, "", number, rows); });
	return rows;
}
