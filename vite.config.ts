import { defineConfig } from 'vitest/config';

// biome-ignore lint/style/noDefaultExport: Vite loads its config from the default export
export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
    },
});
