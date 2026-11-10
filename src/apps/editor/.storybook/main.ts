import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
    framework: '@storybook/react-vite',
    addons: ['@storybook/addon-vitest'],
    // One folder deep: Vitest names each story file's screenshot folder after it, e.g. __screenshots__/App.stories.tsx/
    stories: ['../components/*/*.stories.tsx', '../elements/*/*.stories.tsx'],
};

// biome-ignore lint/style/noDefaultExport: Storybook loads its config from the default export
export default config;
