import { setProjectAnnotations } from '@storybook/react-vite';
import { afterEach, inject } from 'vitest';
import { page } from 'vitest/browser';
import preview from './preview';
import type { ViewportId } from './viewports';

declare module 'vitest' {
    interface ProvidedContext {
        /** The viewport this Storybook test project renders stories at. */
        viewport: ViewportId;
        /** Whether this project's stories get a screenshot at each viewport, named after it. */
        screenshotPerViewport: boolean;
    }
}

// Stories run as tests get the same decorators and parameters as in Storybook
setProjectAnnotations(preview);

// Every story is a screenshot test, with its baselines in __screenshots__/: stories tagged 'page' get
// one per viewport, named after it, the others a single one
afterEach(async ({ expect, task }) => {
    const name = inject('screenshotPerViewport')
        ? `${task.name}-${inject('viewport')}`
        : task.name;
    await expect(page).toMatchScreenshot(name);
});
