import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { AddIcon } from '../../icons/icons';
import { IconButton } from './IconButton';

describe('IconButton', () => {
    test('calls onClick when clicked', async () => {
        const onClick = vi.fn();
        const screen = await render(
            <IconButton icon={AddIcon} label="Add" onClick={onClick} />,
        );
        await screen.getByRole('button', { name: 'Add' }).click();
        expect(onClick).toHaveBeenCalledOnce();
    });

    test('never submits a surrounding form', async () => {
        const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
        const screen = await render(
            <form
                onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}
            >
                <IconButton icon={AddIcon} label="Add" />
            </form>,
        );
        await screen.getByRole('button', { name: 'Add' }).click();
        expect(onSubmit).not.toHaveBeenCalled();
    });
});
