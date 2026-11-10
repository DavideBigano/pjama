import './styles/index.css';
import { beforeEach } from 'vitest';
import { page, userEvent } from 'vitest/browser';

// The pointer stays where the last test left it, which would hover whatever renders under it next
beforeEach(async () => {
    await userEvent.unhover(page.elementLocator(document.body));
});
