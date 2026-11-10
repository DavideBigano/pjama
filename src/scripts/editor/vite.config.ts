import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

// biome-ignore lint/style/noDefaultExport: Vite loads its config from the default export
export default defineConfig({
    test: {
        include: ['**/*.test.js'],
        // The e2e tests start real editors on free ports, so running their files in parallel could make them collide
        fileParallelism: false,
        // A cache per project: the default one at the workspace root breaks when Nx runs projects in parallel
        fsModuleCachePath: join(
            import.meta.dirname,
            'node_modules/.vitest-cache',
        ),
    },
});
