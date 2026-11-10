import { join } from 'node:path';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import { type ViewportId, viewports } from './.storybook/viewports';

/** Browser settings running a project's tests in headless Chromium; Vitest mutates them, so each project gets its own. */
function createChromium() {
    return {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [{ browser: 'chromium' as const }],
    };
}

/** The viewport stories that don't lay out with it render at. */
const STORY_VIEWPORT: ViewportId = 'split-1080p';

/** A project running the stories with the given tags as screenshot tests at one viewport. */
function createStorybookProject({
    name,
    viewport,
    tags,
    screenshotPerViewport,
}: {
    name: string;
    viewport: ViewportId;
    tags: { include?: string[]; exclude?: string[] };
    screenshotPerViewport: boolean;
}) {
    return {
        extends: true,
        plugins: [
            storybookTest({
                configDir: join(import.meta.dirname, '.storybook'),
                initialGlobals: { viewport: { value: viewport } },
                tags,
            }),
        ],
        test: {
            name,
            provide: { viewport, screenshotPerViewport },
            setupFiles: ['.storybook/vitest.setup.ts'],
            browser: createChromium(),
        },
    };
}

// biome-ignore lint/style/noDefaultExport: Vite loads its config from the default export
export default defineConfig({
    plugins: [react()],
    test: {
        // A cache per project: the default one at the workspace root breaks when Nx runs projects in parallel
        fsModuleCachePath: join(
            import.meta.dirname,
            'node_modules/.vitest-cache',
        ),
        projects: [
            {
                extends: true,
                test: {
                    name: 'unit',
                    include: ['**/*.test.ts'],
                    exclude: ['**/node_modules/**'],
                },
            },
            {
                extends: true,
                test: {
                    name: 'unit:browser',
                    include: ['**/*.test.tsx'],
                    exclude: ['**/*.screenshot.test.tsx', '**/node_modules/**'],
                    browser: createChromium(),
                },
            },
            {
                extends: true,
                test: {
                    name: 'screenshot',
                    include: ['**/*.screenshot.test.tsx'],
                    exclude: ['**/node_modules/**'],
                    setupFiles: ['screenshot.setup.ts'],
                    browser: createChromium(),
                },
            },
            // Stories tagged 'page' lay out with the viewport: a screenshot at each one
            ...(Object.keys(viewports) as ViewportId[]).map((viewport) =>
                createStorybookProject({
                    name: `storybook:${viewport}`,
                    viewport,
                    tags: { include: ['page'] },
                    screenshotPerViewport: true,
                }),
            ),
            // Every other story looks the same at any viewport: a single screenshot
            createStorybookProject({
                name: 'storybook',
                viewport: STORY_VIEWPORT,
                tags: { exclude: ['page'] },
                screenshotPerViewport: false,
            }),
        ],
    },
});
