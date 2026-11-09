import type { Preview } from '@storybook/react-vite';
import { viewports } from './viewports';

const preview: Preview = {
    parameters: {
        layout: 'fullscreen',
        viewport: { options: viewports },
    },
    initialGlobals: {
        viewport: { value: 'full-1080p', isRotated: false },
    },
};

// biome-ignore lint/style/noDefaultExport: Storybook loads its preview config from the default export
export default preview;
