import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from './App';

const meta = {
    component: App,
} satisfies Meta<typeof App>;

// biome-ignore lint/style/noDefaultExport: Storybook reads a story file's metadata from its default export
export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
