import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';
import { TextField } from './TextField';

const meta = {
    component: TextField,
    decorators: [
        (Story) => (
            <div style={{ maxWidth: 560, padding: 16 }}>
                <Story />
            </div>
        ),
    ],
    // Committed edits update the value arg, so they stick and show in the Controls panel
    render: function Render(args) {
        const [, updateArgs] = useArgs<typeof args>();
        return (
            <TextField
                {...args}
                onChange={(value) => {
                    args.onChange(value);
                    updateArgs({ value });
                }}
            />
        );
    },
    args: {
        value: 'Rejects empty names',
        onChange: fn(),
        label: 'Name',
        placeholder: 'Name',
    },
} satisfies Meta<typeof TextField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithValue: Story = {};

export const Empty: Story = { args: { value: '' } };

export const Multiline: Story = {
    args: {
        value: 'A component always has a name,\ntrimmed of surrounding spaces.',
        label: 'Description',
        placeholder: 'Description',
        multiline: true,
    },
};

export const WithSuggestions: Story = {
    args: {
        value: '',
        label: 'Category',
        placeholder: 'performance, security…',
        suggestions: ['performance', 'security', 'usability', 'validation'],
    },
};
