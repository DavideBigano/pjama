import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, onTestFinished, test } from 'vitest';

const run = promisify(execFile);
const START = fileURLToPath(new URL('./start.js', import.meta.url));
const STOP = fileURLToPath(new URL('./stop.js', import.meta.url));

describe('stop', () => {
    test('stops the editor on the port', async () => {
        const probe = createServer().listen(0, '127.0.0.1');
        await once(probe, 'listening');
        const { port } = probe.address();
        probe.close();
        await run(process.execPath, [START, String(port)]);
        await run(process.execPath, [STOP, String(port)]);
        await expect(
            fetch(`http://127.0.0.1:${port}/api/version`),
        ).rejects.toThrow();
    });
    test('reports the editor stopped', async () => {
        const probe = createServer().listen(0, '127.0.0.1');
        await once(probe, 'listening');
        const { port } = probe.address();
        probe.close();
        await run(process.execPath, [START, String(port)]);
        const { stdout } = await run(process.execPath, [STOP, String(port)]);
        expect(stdout).toContain(`Stopped the projMap editor on port ${port}`);
    });
    test('reports when no editor is running', async () => {
        const probe = createServer().listen(0, '127.0.0.1');
        await once(probe, 'listening');
        const { port } = probe.address();
        probe.close();
        const { stdout } = await run(process.execPath, [STOP, String(port)]);
        expect(stdout).toContain(`No projMap editor running on port ${port}`);
    });
    test('fails when something else holds the port', async () => {
        const other = createServer((_req, res) =>
            res.writeHead(404).end(),
        ).listen(0, '127.0.0.1');
        await once(other, 'listening');
        onTestFinished(() => other.close());
        await expect(
            run(process.execPath, [STOP, String(other.address().port)]),
        ).rejects.toMatchObject({ code: 1 });
    });
    test('leaves something else holding the port running', async () => {
        const other = createServer((_req, res) =>
            res.writeHead(404).end(),
        ).listen(0, '127.0.0.1');
        await once(other, 'listening');
        onTestFinished(() => other.close());
        const { port } = other.address();
        await run(process.execPath, [STOP, String(port)]).catch(() => {});
        const response = await fetch(`http://127.0.0.1:${port}/`);
        expect(response.status).toBe(404);
    });
    test('fails on an invalid port', async () => {
        await expect(
            run(process.execPath, [STOP, 'abc']),
        ).rejects.toMatchObject({ code: 1 });
    });
});
