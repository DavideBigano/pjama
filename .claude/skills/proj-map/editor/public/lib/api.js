/** Error thrown when the map file changed on disk since it was loaded. */
export class ConflictError extends Error {
	constructor(version) {
		super("projMap.json changed on disk");
		this.version = version;
	}
}

/** Client for the editor server. `fetchFn` is injectable for tests. */
export function createApi(fetchFn = globalThis.fetch.bind(globalThis)) {
	const request = async (method, path, body) => {
		const response = await fetchFn(path, {
			method,
			headers: body ? { "content-type": "application/json" } : {},
			body: body ? JSON.stringify(body) : undefined,
		});
		const data = await response.json().catch(() => ({}));
		if (response.status === 409) throw new ConflictError(data.version);
		if (!response.ok) throw new Error(data.error || `${method} ${path} failed (${response.status})`);
		return data;
	};
	return {
		/** `{ map, version, layout, path, shownPath, exists }` */
		load: () => request("GET", "/api/map"),
		/** Current version of the file on disk. */
		getVersion: () => request("GET", "/api/version"),
		/** Writes the map unless the file moved past `baseVersion` (or `force`); resolves to the new `{ version }`. */
		save: (map, baseVersion, force = false) => request("PUT", "/api/map", { map, baseVersion, force }),
		/** Writes node positions, which live next to the map but outside it. */
		saveLayout: layout => request("PUT", "/api/layout", { layout }),
	};
}
