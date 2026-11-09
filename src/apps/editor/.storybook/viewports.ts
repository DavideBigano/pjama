/** A viewport the editor is checked at, sized in CSS pixels. */
type Viewport = {
    name: string;
    styles: { width: `${number}px`; height: `${number}px` };
    type: 'desktop';
};

/** The viewports stories are viewed and tested at. */
export const viewports = {
    'vscode-split-1080p': {
        name: 'VS Code split, 1080p',
        styles: { width: '800px', height: '900px' },
        type: 'desktop',
    },
    'split-1080p': {
        name: 'Split screen, 1080p',
        styles: { width: '960px', height: '950px' },
        type: 'desktop',
    },
    'split-2k': {
        name: 'Split screen, 2K',
        styles: { width: '1280px', height: '1300px' },
        type: 'desktop',
    },
    'full-1080p': {
        name: 'Full screen, 1080p',
        styles: { width: '1920px', height: '950px' },
        type: 'desktop',
    },
    'full-2k': {
        name: 'Full screen, 2K',
        styles: { width: '2560px', height: '1300px' },
        type: 'desktop',
    },
} as const satisfies Record<string, Viewport>;

export type ViewportId = keyof typeof viewports;
