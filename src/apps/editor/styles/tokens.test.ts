import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const EDITOR_DIR = join(import.meta.dirname, '..');

/** Every CSS Module of the app's components and elements, as `[path relative to the editor, source]`. */
const moduleSources = globSync(
    ['components/**/*.module.css', 'elements/**/*.module.css'],
    {
        cwd: EDITOR_DIR,
    },
).map((path) => [path, readFileSync(join(EDITOR_DIR, path), 'utf8')]);

describe.each(moduleSources)('CSS Module: %s', (_path, source) => {
    test('has no colour literals', () => {
        expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\(/i);
    });

    test('uses only tokens the theme defines', () => {
        const defined = new Set(
            readFileSync(join(EDITOR_DIR, 'styles/theme.css'), 'utf8').match(
                /--[\w-]+(?=\s*:)/g,
            ),
        );
        const used = [...source.matchAll(/var\((--[\w-]+)/g)].map(
            ([, name]) => name,
        );
        expect(used.filter((name) => !defined.has(name))).toEqual([]);
    });
});
