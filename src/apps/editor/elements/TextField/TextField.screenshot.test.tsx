import type { ReactNode } from 'react';
import { describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { TextField } from './TextField';

const FRAME_STYLE = { width: 360, padding: 16 };

/** A 360px frame on the page background; the screenshots capture it. */
function Frame({ children }: { children: ReactNode }) {
    return (
        <div data-testid="frame" style={FRAME_STYLE}>
            {children}
        </div>
    );
}

/** The same frame on a card's surface. */
function CardFrame({ children }: { children: ReactNode }) {
    return (
        <div
            data-testid="frame"
            style={{ ...FRAME_STYLE, background: 'var(--color-surface)' }}
        >
            {children}
        </div>
    );
}

const LONG_WORD = 'Supercalifragilisticexpialidocious'.repeat(4);

describe('TextField', () => {
    test('on a card', async () => {
        const screen = await render(
            <TextField
                value="Rejects empty names"
                onChange={() => {}}
                label="Name"
                placeholder="Name"
            />,
            { wrapper: CardFrame },
        );
        await expect
            .element(screen.getByTestId('frame'))
            .toMatchScreenshot('on-card');
    });

    test('hovered on a card', async () => {
        const screen = await render(
            <TextField
                value="Rejects empty names"
                onChange={() => {}}
                label="Name"
                placeholder="Name"
            />,
            { wrapper: CardFrame },
        );
        await userEvent.hover(screen.getByRole('button', { name: 'Name' }));
        await expect
            .element(screen.getByTestId('frame'))
            .toMatchScreenshot('hovered-on-card');
    });

    test('hovered on the page', async () => {
        const screen = await render(
            <TextField
                value="Rejects empty names"
                onChange={() => {}}
                label="Name"
                placeholder="Name"
            />,
            { wrapper: Frame },
        );
        await userEvent.hover(screen.getByRole('button', { name: 'Name' }));
        await expect
            .element(screen.getByTestId('frame'))
            .toMatchScreenshot('hovered-on-page');
    });

    test('editing', async () => {
        const screen = await render(
            <TextField
                value="Rejects empty names"
                onChange={() => {}}
                label="Name"
                placeholder="Name"
            />,
            { wrapper: Frame },
        );
        await screen.getByRole('button', { name: 'Name' }).click();
        await expect
            .element(screen.getByTestId('frame'))
            .toMatchScreenshot('editing');
    });

    test('editing multiline', async () => {
        const screen = await render(
            <TextField
                value={
                    'A component always has a name,\ntrimmed of surrounding spaces.'
                }
                onChange={() => {}}
                label="Description"
                placeholder="Description"
                multiline
            />,
            { wrapper: Frame },
        );
        await screen.getByRole('button', { name: 'Description' }).click();
        await expect
            .element(screen.getByTestId('frame'))
            .toMatchScreenshot('editing-multiline');
    });

    test('editing with suggestions', async () => {
        const screen = await render(
            <TextField
                value="perf"
                onChange={() => {}}
                label="Category"
                placeholder="performance, security…"
                suggestions={['performance', 'security']}
            />,
            { wrapper: Frame },
        );
        await screen.getByRole('button', { name: 'Category' }).click();
        await expect
            .element(screen.getByTestId('frame'))
            .toMatchScreenshot('editing-with-suggestions');
    });

    test('long word', async () => {
        const screen = await render(
            <TextField
                value={LONG_WORD}
                onChange={() => {}}
                label="Name"
                placeholder="Name"
            />,
            { wrapper: Frame },
        );
        await expect
            .element(screen.getByTestId('frame'))
            .toMatchScreenshot('long-word');
    });

    test('long word while editing', async () => {
        const screen = await render(
            <TextField
                value={LONG_WORD}
                onChange={() => {}}
                label="Name"
                placeholder="Name"
            />,
            { wrapper: Frame },
        );
        await screen.getByRole('button', { name: 'Name' }).click();
        await expect
            .element(screen.getByTestId('frame'))
            .toMatchScreenshot('long-word-editing');
    });

    test('long word in a multiline field', async () => {
        const screen = await render(
            <TextField
                value={`${LONG_WORD}\nSecond line.`}
                onChange={() => {}}
                label="Description"
                placeholder="Description"
                multiline
            />,
            { wrapper: Frame },
        );
        await expect
            .element(screen.getByTestId('frame'))
            .toMatchScreenshot('long-word-multiline');
    });

    test('long word in a multiline field while editing', async () => {
        const screen = await render(
            <TextField
                value={`${LONG_WORD}\nSecond line.`}
                onChange={() => {}}
                label="Description"
                placeholder="Description"
                multiline
            />,
            { wrapper: Frame },
        );
        await screen.getByRole('button', { name: 'Description' }).click();
        await expect
            .element(screen.getByTestId('frame'))
            .toMatchScreenshot('long-word-multiline-editing');
    });
});
