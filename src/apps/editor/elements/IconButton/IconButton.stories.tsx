import type { Meta, StoryObj } from '@storybook/react-vite';
import { AddIcon, DeleteIcon } from '../../icons/icons';
import { IconButton } from './IconButton';

const meta = {
    component: IconButton,
    decorators: [
        (Story) => (
            <div style={{ padding: 16 }}>
                <Story />
            </div>
        ),
    ],
    args: { icon: AddIcon, label: 'Add' },
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Danger: Story = {
    args: { icon: DeleteIcon, label: 'Delete', tone: 'danger' },
};
