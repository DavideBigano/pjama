import { describe, expect, test } from 'vitest';
import { DEFAULT_PORT } from '../../../.claude/skills/proj-map/editor/server/options.js';
import { getPort } from './port.js';

describe('getPort', () => {
    test("defaults to the editor's default port", () => {
        expect(getPort([])).toBe(DEFAULT_PORT);
    });
    test('reads the given port', () => {
        expect(getPort(['5000'])).toBe(5000);
    });
    test.each(['abc', '4319.5', '0', '65536', ''])(
        'rejects "%s"',
        (argument) => {
            expect(() => getPort([argument])).toThrow();
        },
    );
});
