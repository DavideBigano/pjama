import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { DeleteIcon, RequirementIcon } from '../../icons/icons';
import { Menu } from './Menu';

const meta = {
    component: Menu,
    args: {
        label: 'Actions',
        items: [
            {
                label: 'Open requirement page',
                icon: RequirementIcon,
                onSelect: () => {},
            },
            {
                label: 'Delete requirement',
                icon: DeleteIcon,
                onSelect: () => {},
                tone: 'danger',
            },
        ],
    },
    decorators: [
        (Story) => (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    width: 320,
                    padding: 16,
                }}
            >
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof Menu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'Actions' }),
        );
    },
};
