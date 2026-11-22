import type { ButtonHTMLAttributes, Ref } from 'react';
import type { Icon } from '../../icons/icons';
import styles from './IconButton.module.css';

interface IconButtonProps
    extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'> {
    ref?: Ref<HTMLButtonElement>;
    icon: Icon;
    /** What the button does, read by screen readers and shown on hover. */
    label: string;
    tone?: 'default' | 'danger';
}

/** A borderless button showing only an icon. */
export function IconButton({
    icon: ButtonIcon,
    label,
    tone = 'default',
    className,
    ...props
}: IconButtonProps) {
    return (
        <button
            {...props}
            type="button"
            aria-label={label}
            title={label}
            className={[styles.button, styles[tone], className]
                .filter(Boolean)
                .join(' ')}
        >
            <ButtonIcon aria-hidden />
        </button>
    );
}
