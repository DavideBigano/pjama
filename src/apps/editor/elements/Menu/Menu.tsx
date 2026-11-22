import {
    autoUpdate,
    FloatingFocusManager,
    FloatingPortal,
    flip,
    offset,
    shift,
    useClick,
    useDismiss,
    useFloating,
    useInteractions,
    useRole,
} from '@floating-ui/react';
import { useState } from 'react';
import { type Icon, MenuIcon } from '../../icons/icons';
import { IconButton } from '../IconButton/IconButton';
import styles from './Menu.module.css';

/** An action of a menu. */
export interface MenuItem {
    label: string;
    icon: Icon;
    onSelect: () => void;
    tone?: 'default' | 'danger';
}

interface MenuProps {
    /** Names the button opening the menu. */
    label: string;
    /** Without any, the menu doesn't show at all. */
    items: MenuItem[];
}

/**
 * A button opening a list of actions; picking one, Escape or clicking elsewhere closes it.
 *
 * Floating UI renders the list over the page, so no container clips it,
 * and moves it to the other side of the button when it doesn't fit.
 * CSS anchor positioning would do the same without a library once browsers support it: see todo.md.
 */
export function Menu({ label, items }: MenuProps) {
    const [open, setOpen] = useState(false);
    const { refs, floatingStyles, context } = useFloating({
        open,
        onOpenChange: setOpen,
        placement: 'bottom-end',
        middleware: [
            offset(({ elements }) =>
                readLength(elements.floating, '--space-2xs'),
            ),
            flip(),
            shift(({ elements }) => ({
                padding: readLength(elements.floating, '--space-sm'),
            })),
        ],
        whileElementsMounted: autoUpdate,
    });
    const { getReferenceProps, getFloatingProps } = useInteractions([
        useClick(context),
        useDismiss(context),
        useRole(context, { role: 'menu' }),
    ]);

    if (!items.length) {
        return null;
    }

    return (
        <>
            <IconButton
                ref={refs.setReference}
                icon={MenuIcon}
                label={label}
                {...getReferenceProps()}
            />
            {open && (
                <FloatingPortal>
                    {/* Keeps the focus on the button, while Tab still reaches the items */}
                    <FloatingFocusManager
                        context={context}
                        modal={false}
                        initialFocus={-1}
                    >
                        <div
                            ref={refs.setFloating}
                            style={floatingStyles}
                            className={styles.items}
                            {...getFloatingProps()}
                        >
                            {items.map(
                                ({
                                    label,
                                    icon: ItemIcon,
                                    onSelect,
                                    tone = 'default',
                                }) => (
                                    <button
                                        key={label}
                                        type="button"
                                        role="menuitem"
                                        className={`${styles.item} ${styles[tone] ?? ''}`}
                                        onClick={() => {
                                            setOpen(false);
                                            onSelect();
                                        }}
                                    >
                                        <ItemIcon aria-hidden />
                                        {label}
                                    </button>
                                ),
                            )}
                        </div>
                    </FloatingFocusManager>
                </FloatingPortal>
            )}
        </>
    );
}

/** Reads a theme length, in pixels, as Floating UI takes it. */
function readLength(element: Element, variable: string): number {
    return Number.parseFloat(
        getComputedStyle(element).getPropertyValue(variable),
    );
}
