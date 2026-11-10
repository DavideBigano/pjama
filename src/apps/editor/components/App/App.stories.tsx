import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from './App';

const meta = {
    component: App,
} satisfies Meta<typeof App>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
