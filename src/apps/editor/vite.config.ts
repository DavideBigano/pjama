import { join } from 'node:path';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import { type ViewportId, viewports } from './.storybook/viewports';

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
                    include: ['**/*.test.{ts,tsx}'],
                    exclude: ['**/*.screenshot.test.tsx', '**/node_modules/**'],
                },
            },
            ...(Object.keys(viewports) as ViewportId[]).map((viewport) => ({
                extends: true,
                plugins: [
                    storybookTest({
                        configDir: join(import.meta.dirname, '.storybook'),
                        initialGlobals: { viewport: { value: viewport } },
                    }),
                ],
                test: {
                    name: `storybook:${viewport}`,
                    provide: { viewport },
                    setupFiles: ['.storybook/vitest.setup.ts'],
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright(),
                        instances: [{ browser: 'chromium' as const }],
                    },
                },
            })),
        ],
    },
});
