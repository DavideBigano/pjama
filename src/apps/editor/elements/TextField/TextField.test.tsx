import { describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { TextField } from './TextField';

describe('TextField', () => {
    test('enters edit mode when clicked', async () => {
        const screen = await render(
            <TextField
                value="Name"
                onChange={() => {}}
                label="Name"
                placeholder="Empty"
            />,
        );
        await screen.getByRole('button', { name: 'Name' }).click();
        await expect
            .element(screen.getByRole('textbox', { name: 'Name' }))
            .toHaveFocus();
    });

    test('places the caret at the end of the value', async () => {
        const screen = await render(
            <TextField
                value="Name"
                onChange={() => {}}
                label="Name"
                placeholder="Empty"
            />,
        );
        await screen.getByRole('button', { name: 'Name' }).click();
        await userEvent.keyboard('s');
        await expect.element(screen.getByRole('textbox')).toHaveValue('Names');
    });

    test('commits the edit on Enter', async () => {
        const onChange = vi.fn();
        const screen = await render(
            <TextField
                value=""
                onChange={onChange}
                label="Name"
                placeholder="Empty"
            />,
        );
        await screen.getByRole('button', { name: 'Name' }).click();
        await userEvent.keyboard('Login{Enter}');
        expect(onChange).toHaveBeenCalledWith('Login');
    });

    test('commits the edit when leaving the field', async () => {
        const onChange = vi.fn();
        const screen = await render(
            <TextField
                value=""
                onChange={onChange}
                label="Name"
                placeholder="Empty"
            />,
        );
        await screen.getByRole('button', { name: 'Name' }).click();
        await userEvent.keyboard('Login');
        await userEvent.tab();
        expect(onChange).toHaveBeenCalledWith('Login');
    });

    test('drops the edit on Escape', async () => {
        const onChange = vi.fn();
        const screen = await render(
            <TextField
                value=""
                onChange={onChange}
                label="Name"
                placeholder="Empty"
            />,
        );
        await screen.getByRole('button', { name: 'Name' }).click();
        await userEvent.keyboard('Login{Escape}');
        expect(onChange).not.toHaveBeenCalled();
    });

    test("doesn't report an unchanged value", async () => {
        const onChange = vi.fn();
        const screen = await render(
            <TextField
                value="Login"
                onChange={onChange}
                label="Name"
                placeholder="Empty"
            />,
        );
        await screen.getByRole('button', { name: 'Name' }).click();
        await userEvent.keyboard('{Enter}');
        expect(onChange).not.toHaveBeenCalled();
    });

    test('breaks lines on Shift+Enter when multiline', async () => {
        const onChange = vi.fn();
        const screen = await render(
            <TextField
                value=""
                onChange={onChange}
                label="Description"
                placeholder="Empty"
                multiline
            />,
        );
        await screen.getByRole('button', { name: 'Description' }).click();
        await userEvent.keyboard('a{Shift>}{Enter}{/Shift}b{Enter}');
        expect(onChange).toHaveBeenCalledWith('a\nb');
    });

    test('keeps a single-line value on one line when given line breaks', async () => {
        const onChange = vi.fn();
        const screen = await render(
            <TextField
                value=""
                onChange={onChange}
                label="Name"
                placeholder="Empty"
            />,
        );
        await screen.getByRole('button', { name: 'Name' }).click();
        await screen.getByRole('textbox').fill('two\nlines');
        await userEvent.keyboard('{Enter}');
        expect(onChange).toHaveBeenCalledWith('two lines');
    });

    test('grows with its content instead of scrolling', async () => {
        const screen = await render(
            <div style={{ width: 120 }}>
                <TextField
                    value=""
                    onChange={() => {}}
                    label="Name"
                    placeholder="Empty"
                />
            </div>,
        );
        await screen.getByRole('button', { name: 'Name' }).click();
        await userEvent.keyboard(
            'a name long enough to wrap over several lines...like...looooooooooooooooooooooooooooooooo...',
        );
        const editor = screen.getByRole('textbox').element();
        expect(editor.scrollHeight).toBeLessThanOrEqual(editor.clientHeight);
    });

    test('stays in edit mode when its suggestions button is clicked', async () => {
        const screen = await render(
            <TextField
                value=""
                onChange={() => {}}
                label="Category"
                placeholder="Empty"
                suggestions={['security']}
            />,
        );
        await screen.getByRole('button', { name: 'Category' }).click();
        await screen.getByRole('button', { name: 'Show suggestions' }).click();
        await expect.element(screen.getByRole('combobox')).toHaveFocus();
    });
});
