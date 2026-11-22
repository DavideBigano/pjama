import { describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { DeleteIcon } from '../../icons/icons';
import { Menu } from './Menu';

function createItems(onSelect = () => {}) {
    return [
        {
            label: 'Delete',
            icon: DeleteIcon,
            onSelect,
            tone: 'danger' as const,
        },
    ];
}

describe('Menu', () => {
    test('calls the picked item', async () => {
        const onSelect = vi.fn();
        const screen = await render(
            <Menu label="Actions" items={createItems(onSelect)} />,
        );
        await screen.getByRole('button', { name: 'Actions' }).click();
        await screen.getByRole('menuitem', { name: 'Delete' }).click();
        expect(onSelect).toHaveBeenCalledOnce();
    });

    test('closes once an item is picked', async () => {
        const screen = await render(
            <Menu label="Actions" items={createItems()} />,
        );
        await screen.getByRole('button', { name: 'Actions' }).click();
        await expect.element(screen.getByRole('menu')).toBeVisible();
        await screen.getByRole('menuitem', { name: 'Delete' }).click();
        await expect.element(screen.getByRole('menu')).not.toBeInTheDocument();
    });

    test('closes on Escape', async () => {
        const screen = await render(
            <Menu label="Actions" items={createItems()} />,
        );
        await screen.getByRole('button', { name: 'Actions' }).click();
        await expect.element(screen.getByRole('menu')).toBeVisible();
        await userEvent.keyboard('{Escape}');
        await expect.element(screen.getByRole('menu')).not.toBeInTheDocument();
    });

    test('closes when clicking elsewhere', async () => {
        const screen = await render(
            <>
                <p>Elsewhere</p>
                <Menu label="Actions" items={createItems()} />
            </>,
        );
        await screen.getByRole('button', { name: 'Actions' }).click();
        await expect.element(screen.getByRole('menu')).toBeVisible();
        await screen.getByText('Elsewhere').click();
        await expect.element(screen.getByRole('menu')).not.toBeInTheDocument();
    });

    test('shows nothing without items', async () => {
        const screen = await render(<Menu label="Actions" items={[]} />);
        await expect
            .element(screen.getByRole('button', { name: 'Actions' }))
            .not.toBeInTheDocument();
    });
});
