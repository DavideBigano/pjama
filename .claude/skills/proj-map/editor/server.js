#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEmptyMap } from "./public/lib/model.js";
import { createHandler } from "./server/app.js";
import { getOptions } from "./server/options.js";
import { createMapStore } from "./server/store.js";

const HOST = "127.0.0.1";
const PORT_ATTEMPTS = 20;

/** Starts listening on the first free port from `port` on; resolves to the port used. */
function listen(server, port, attemptsLeft = PORT_ATTEMPTS) {
	return new Promise((resolve, reject) => {
		const onError = error => {
			server.off("listening", onListening);
			if (error.code === "EADDRINUSE" && attemptsLeft > 1 && port !== 0) resolve(listen(server, port + 1, attemptsLeft - 1));
			else reject(error);
		};
		const onListening = () => { server.off("error", onError); resolve(server.address().port); };
		server.once("error", onError);
		server.once("listening", onListening);
		server.listen(port, HOST);
	});
}

/** Opens a URL in the default browser. */
function openInBrowser(url) {
	const [command, ...args] = process.platform === "darwin" ? ["open", url] : process.platform === "win32" ? ["cmd", "/c", "start", "", url] : ["xdg-open", url];
	spawn(command, args, { detached: true, stdio: "ignore" }).on("error", () => {}).unref();
}

/** Builds a blank map named after the project folder. */
const createMapFor = root => () => {
	const name = path.basename(root);
	return createEmptyMap({ mapId: randomUUID(), mapSlug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), label: name });
};

const options = getOptions(process.argv.slice(2), process.cwd());
const store = createMapStore({ fs, mapPath: options.mapPath, layoutPath: options.layoutPath, createMap: createMapFor(options.root) });
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");
const server = http.createServer(createHandler({ store, fs, publicDir, root: options.root, mapPath: options.mapPath }));
const port = await listen(server, options.port);
const url = `http://${HOST}:${port}/`;

console.log(`projMap editor running at ${url}`);
console.log(`Editing ${options.mapPath}${(await store.getCurrentVersion()) === null ? " (not created yet: the first save creates it)" : ""}`);
if (options.open) openInBrowser(url);
