import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { getPort } from './port.js';

const SERVER_PATH = fileURLToPath(
    new URL(
        '../../../.claude/skills/proj-map/editor/server.js',
        import.meta.url,
    ),
);
const START_TIMEOUT_MS = 10_000;

try {
    const port = getPort(process.argv.slice(2));
    const running = await fetch(`http://127.0.0.1:${port}/api/version`).then(
        async (response) => response.ok && 'version' in (await response.json()),
        () => false,
    );
    if (running) {
        console.log(
            `projMap editor already running at http://127.0.0.1:${port}/`,
        );
        process.exit();
    }
    // The editor's output is piped only until it is up: it must not write after its startup lines,
    // since this process exits and closes the pipe.
    const editor = spawn(
        process.execPath,
        [SERVER_PATH, '--port', String(port)],
        { detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    editor.unref();
    let output = '';
    const startup = new Promise((resolve, reject) => {
        for (const stream of [editor.stdout, editor.stderr]) {
            stream.setEncoding('utf8').on('data', (chunk) => {
                output += chunk;
                if (/^Editing .*\n/m.test(output)) resolve();
            });
        }
        editor.once('exit', (code) =>
            reject(
                new Error(
                    `The editor exited with code ${code}:\n${output.trim()}`,
                ),
            ),
        );
    });
    const timeout = sleep(START_TIMEOUT_MS).then(() => {
        throw new Error(
            `The editor didn't start within ${START_TIMEOUT_MS / 1000}s:\n${output.trim()}`,
        );
    });
    await Promise.race([startup, timeout]);
    console.log(output.trim());
    process.exit();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
