import { setProjectAnnotations } from '@storybook/react-vite';
import { afterEach, inject } from 'vitest';
import { page } from 'vitest/browser';
import preview from './preview';
import type { ViewportId } from './viewports';

declare module 'vitest' {
    interface ProvidedContext {
        /** The viewport this Storybook test project renders stories at. */
        viewport: ViewportId;
    }
}

// Stories run as tests get the same decorators and parameters as in Storybook
setProjectAnnotations(preview);

// Every story is a screenshot test at each viewport, with one baseline per viewport in __screenshots__/
afterEach(async ({ expect, task }) => {
    await expect(page).toMatchScreenshot(`${task.name}-${inject('viewport')}`);
});
