import { DEFAULT_PORT } from '../../../.claude/skills/proj-map/editor/server/options.js';

/** Reads the optional port argument, defaulting to the editor's default port; throws if it isn't a valid port. */
export function getPort(argv) {
    if (argv[0] === undefined) return DEFAULT_PORT;
    const port = Number(argv[0]);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
        throw new Error(
            `"${argv[0]}" isn't a port: expected a whole number from 1 to 65535`,
        );
    return port;
}
