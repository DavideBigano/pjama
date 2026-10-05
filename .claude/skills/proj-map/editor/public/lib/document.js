import { createIndex, fillMissingLists } from "./model.js";

/**
 * The map being edited, its id index, and what was last saved: enough to tell unsaved changes
 * apart and to swap in a fresh copy of the file.
 */
export function createDocument({ map, version = null, exists = false, layout = {} }) {
	const doc = {
		map: fillMissingLists(map),
		index: {},
		version,
		exists,
		positions: { ...(layout.positions ?? {}) },
		savedJson: "",
		/** Rebuilds the id index after items were added or removed. */
		reindex() {
			doc.index = createIndex(doc.map);
			return doc.index;
		},
		/** Whether the map differs from the last saved (or loaded) copy. */
		isDirty: () => JSON.stringify(doc.map) !== doc.savedJson,
		/** Records the current map as saved, under the file's new version. */
		markSaved(newVersion) {
			doc.version = newVersion;
			doc.exists = true;
			doc.savedJson = JSON.stringify(doc.map);
		},
		/** Replaces the map with a fresh copy read from disk. */
		replace({ map: freshMap, version: freshVersion, exists: freshExists }) {
			doc.map = fillMissingLists(freshMap);
			doc.reindex();
			doc.exists = freshExists;
			doc.markSaved(freshVersion);
		},
	};
	doc.reindex();
	doc.savedJson = JSON.stringify(doc.map);
	return doc;
}
