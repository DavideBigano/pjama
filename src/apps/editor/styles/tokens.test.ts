import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const APP_DIR = join(import.meta.dirname, '..');

/** Every CSS Module in the app, as `[path relative to the app, source]`. */
const moduleSources = globSync('components/**/*.module.css', {
    cwd: APP_DIR,
}).map((path) => [path, readFileSync(join(APP_DIR, path), 'utf8')]);

describe.each(moduleSources)('%s', (_path, source) => {
    test('has no colour literals', () => {
        expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\(/i);
    });

    test("doesn't read the palette", () => {
        expect(source).not.toMatch(
            /var\(--(?:zinc|indigo|violet|red|amber|black)-/,
        );
    });

    test('uses only tokens the theme defines', () => {
        const defined = new Set(
            readFileSync(join(APP_DIR, 'styles/theme.css'), 'utf8').match(
                /--[\w-]+(?=\s*:)/g,
            ),
        );
        const used = [...source.matchAll(/var\((--[\w-]+)/g)].map(
            ([, name]) => name,
        );
        expect(used.filter((name) => !defined.has(name))).toEqual([]);
    });
});

test('finds the CSS Modules it checks', () => {
    expect(moduleSources.map(([path]) => path)).toContain(
        'components/App/App.module.css',
    );
});
