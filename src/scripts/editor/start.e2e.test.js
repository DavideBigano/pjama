import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, onTestFinished, test } from 'vitest';
import { SHUTDOWN_HEADER } from '../../../.claude/skills/proj-map/editor/server/app.js';

const run = promisify(execFile);
const START = fileURLToPath(new URL('./start.js', import.meta.url));

describe('start', () => {
    test("prints the editor's URL once it is up", async () => {
        const probe = createServer().listen(0, '127.0.0.1');
        await once(probe, 'listening');
        const { port } = probe.address();
        probe.close();
        onTestFinished(() =>
            fetch(`http://127.0.0.1:${port}/api/shutdown`, {
                method: 'POST',
                headers: { [SHUTDOWN_HEADER]: '1' },
            }),
        );
        const { stdout } = await run(process.execPath, [START, String(port)]);
        expect(stdout).toContain(`running at http://127.0.0.1:${port}/`);
    });
    test('returns with the editor up', async () => {
        const probe = createServer().listen(0, '127.0.0.1');
        await once(probe, 'listening');
        const { port } = probe.address();
        probe.close();
        onTestFinished(() =>
            fetch(`http://127.0.0.1:${port}/api/shutdown`, {
                method: 'POST',
                headers: { [SHUTDOWN_HEADER]: '1' },
            }),
        );
        await run(process.execPath, [START, String(port)]);
        const response = await fetch(`http://127.0.0.1:${port}/api/version`);
        expect(response.ok).toBe(true);
    });
    test('reports an editor already running on the port', async () => {
        const probe = createServer().listen(0, '127.0.0.1');
        await once(probe, 'listening');
        const { port } = probe.address();
        probe.close();
        onTestFinished(() =>
            fetch(`http://127.0.0.1:${port}/api/shutdown`, {
                method: 'POST',
                headers: { [SHUTDOWN_HEADER]: '1' },
            }),
        );
        await run(process.execPath, [START, String(port)]);
        const { stdout } = await run(process.execPath, [START, String(port)]);
        expect(stdout).toContain(
            `already running at http://127.0.0.1:${port}/`,
        );
    });
    test("doesn't start another editor when one is running", async () => {
        const probe = createServer().listen(0, '127.0.0.1');
        await once(probe, 'listening');
        const { port } = probe.address();
        probe.close();
        onTestFinished(() =>
            fetch(`http://127.0.0.1:${port}/api/shutdown`, {
                method: 'POST',
                headers: { [SHUTDOWN_HEADER]: '1' },
            }),
        );
        onTestFinished(() =>
            fetch(`http://127.0.0.1:${port + 1}/api/shutdown`, {
                method: 'POST',
                headers: { [SHUTDOWN_HEADER]: '1' },
            }).catch(() => {}),
        );
        await run(process.execPath, [START, String(port)]);
        await run(process.execPath, [START, String(port)]);
        const nextPortAnswers = await fetch(
            `http://127.0.0.1:${port + 1}/api/version`,
        ).then(
            () => true,
            () => false,
        );
        expect(nextPortAnswers).toBe(false);
    });
    test('fails on an invalid port', async () => {
        await expect(
            run(process.execPath, [START, 'abc']),
        ).rejects.toMatchObject({ code: 1 });
    });
});
