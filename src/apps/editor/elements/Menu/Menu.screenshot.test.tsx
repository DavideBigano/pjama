import type { ReactNode } from 'react';
import { describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { DeleteIcon, RequirementIcon } from '../../icons/icons';
import { Menu, type MenuItem } from './Menu';

const ITEMS: MenuItem[] = [
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
];

/** A frame tall enough for the open menu, with the button at its right; the screenshots capture it. */
function Frame({ children }: { children: ReactNode }) {
    return (
        <div
            data-testid="frame"
            style={{
                display: 'flex',
                justifyContent: 'flex-end',
                width: 320,
                height: 140,
                padding: 16,
            }}
        >
            {children}
        </div>
    );
}

/** The same frame, with the button against the page's left edge. */
function LeftEdgeFrame({ children }: { children: ReactNode }) {
    return (
        <div data-testid="frame" style={{ width: 320, height: 140 }}>
            {children}
        </div>
    );
}

/** The same frame, with the button against the page's bottom edge. */
function BottomEdgeFrame({ children }: { children: ReactNode }) {
    return (
        <div
            data-testid="frame"
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'flex-end',
                width: 320,
                height: 140,
                padding: 16,
                paddingBottom: 0,
            }}
        >
            {children}
        </div>
    );
}

describe('Menu', () => {
    test('item hovered', async () => {
        const screen = await render(<Menu label="Actions" items={ITEMS} />, {
            wrapper: Frame,
        });
        await screen.getByRole('button', { name: 'Actions' }).click();
        await userEvent.hover(
            screen.getByRole('menuitem', { name: 'Open requirement page' }),
        );
        await expect
            .element(screen.getByTestId('frame'))
            .toMatchScreenshot('item-hovered');
    });

    test('danger item hovered', async () => {
        const screen = await render(<Menu label="Actions" items={ITEMS} />, {
            wrapper: Frame,
        });
        await screen.getByRole('button', { name: 'Actions' }).click();
        await userEvent.hover(
            screen.getByRole('menuitem', { name: 'Delete requirement' }),
        );
        await expect
            .element(screen.getByTestId('frame'))
            .toMatchScreenshot('danger-item-hovered');
    });

    test('item focused from the keyboard', async () => {
        const screen = await render(<Menu label="Actions" items={ITEMS} />, {
            wrapper: Frame,
        });
        await screen.getByRole('button', { name: 'Actions' }).click();
        await userEvent.keyboard('{Tab}');
        await expect
            .element(screen.getByTestId('frame'))
            .toMatchScreenshot('item-focused');
    });

    test('long label', async () => {
        const screen = await render(
            <Menu
                label="Actions"
                items={[
                    {
                        label: 'Open the requirement page in a new editor tab',
                        icon: RequirementIcon,
                        onSelect: () => {},
                    },
                ]}
            />,
            { wrapper: Frame },
        );
        await screen.getByRole('button', { name: 'Actions' }).click();
        // The menu grows past the frame, so just the menu
        await expect
            .element(screen.getByRole('menu'))
            .toMatchScreenshot('long-label');
    });

    test('opened against the left edge', async () => {
        const screen = await render(<Menu label="Actions" items={ITEMS} />, {
            wrapper: LeftEdgeFrame,
        });
        await screen.getByRole('button', { name: 'Actions' }).click();
        await expect
            .element(screen.getByTestId('frame'))
            .toMatchScreenshot('left-edge');
    });

    test('opened against the bottom edge', async () => {
        const screen = await render(<Menu label="Actions" items={ITEMS} />, {
            wrapper: BottomEdgeFrame,
        });
        await screen.getByRole('button', { name: 'Actions' }).click();
        await expect
            .element(screen.getByTestId('frame'))
            .toMatchScreenshot('bottom-edge');
    });
});
