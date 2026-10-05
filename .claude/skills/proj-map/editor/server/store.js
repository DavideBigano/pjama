import { createHash } from "node:crypto";
import path from "node:path";

/** Short content hash used to detect edits made to the file by someone else. */
export const getVersion = text => createHash("sha1").update(text).digest("hex").slice(0, 12);

/** Indentation an existing JSON file uses, so rewrites keep its style (two spaces by default). */
export const getIndent = text => /^[{[]\r?\n([ \t]+)/.exec(text ?? "")?.[1] ?? "  ";

/** Error raised when the file moved past the version the editor loaded. */
export class VersionConflict extends Error {
	constructor(version) {
		super("The map file changed since it was loaded");
		this.version = version;
	}
}

/**
 * Reads and writes the map file and its layout file. `fs` is `node:fs/promises` (injectable);
 * `createMap` builds the blank map served while the file doesn't exist yet.
 */
export function createMapStore({ fs, mapPath, layoutPath, createMap }) {
	const readText = async file => {
		try { return await fs.readFile(file, "utf8"); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
	};
	const writeAtomically = async (file, text) => {
		await fs.mkdir(path.dirname(file), { recursive: true });
		const temporary = `${file}.${process.pid}.tmp`;
		await fs.writeFile(temporary, text);
		await fs.rename(temporary, file);
	};
	const parse = (text, file) => {
		try { return JSON.parse(text); } catch (error) { throw new Error(`${file} isn't valid JSON: ${error.message}`); }
	};

	return {
		/** `{ map, version, exists }`; a blank map with a null version while the file is missing. */
		async read() {
			const text = await readText(mapPath);
			if (text === null) return { map: createMap(), version: null, exists: false };
			return { map: parse(text, mapPath), version: getVersion(text), exists: true };
		},
		/** Version of the file on disk, null when missing. */
		async getCurrentVersion() {
			const text = await readText(mapPath);
			return text === null ? null : getVersion(text);
		},
		/** Writes the map unless the file changed since `baseVersion` (pass `force` to overwrite anyway). Returns the new version. */
		async write(map, baseVersion, force = false) {
			const current = await readText(mapPath);
			const currentVersion = current === null ? null : getVersion(current);
			if (!force && currentVersion !== baseVersion) throw new VersionConflict(currentVersion);
			const text = JSON.stringify(map, null, getIndent(current)) + "\n";
			await writeAtomically(mapPath, text);
			return getVersion(text);
		},
		/** Saved node positions, `{ positions: { [componentId]: [x, y] } }`. */
		async readLayout() {
			const text = await readText(layoutPath);
			if (text === null) return { positions: {} };
			try { return JSON.parse(text); } catch { return { positions: {} }; }
		},
		/** Saves node positions. */
		writeLayout: layout => writeAtomically(layoutPath, JSON.stringify(layout, null, "\t") + "\n"),
	};
}
