import path from "node:path";
import { parseArgs } from "node:util";

export const DEFAULT_PORT = 4319;

/**
 * Reads the command line: `[mapPath] [--port N] [--root DIR] [--open]`.
 * The map defaults to `.projMap/projMap.json` under `cwd`; resource paths resolve against `root`,
 * which defaults to the folder holding `.projMap` (or the map's own folder).
 */
export function getOptions(argv, cwd) {
	const { values, positionals } = parseArgs({
		args: argv,
		allowPositionals: true,
		options: { port: { type: "string", short: "p" }, root: { type: "string" }, open: { type: "boolean" } },
	});
	const mapPath = path.resolve(cwd, positionals[0] ?? ".projMap/projMap.json");
	const mapDir = path.dirname(mapPath);
	const defaultRoot = path.basename(mapDir) === ".projMap" ? path.dirname(mapDir) : mapDir;
	return {
		mapPath,
		layoutPath: path.join(mapDir, path.basename(mapPath, ".json") + ".layout.json"),
		root: path.resolve(cwd, values.root ?? defaultRoot),
		port: values.port === undefined ? DEFAULT_PORT : Number(values.port),
		open: values.open ?? false,
	};
}
