import {
    type KeyboardEvent,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { SuggestionsIcon } from '../../icons/icons';
import styles from './TextField.module.css';

interface TextFieldProps {
    value: string;
    onChange: (value: string) => void;
    /** Names the field for screen readers. */
    label: string;
    /** Shown in place of an empty value. */
    placeholder: string;
    /** Allows line breaks, entered with Shift+Enter. */
    multiline?: boolean;
    /** Values proposed while typing. For now they keep the editor on one line, without wrapping. */
    suggestions?: string[];
}

/**
 * Text shown as is until clicked, then edited in place, wrapping as it grows.
 * Enter or leaving the field commits the edit, Escape drops it.
 */
export function TextField({
    value,
    onChange,
    label,
    placeholder,
    multiline = false,
    suggestions = [],
}: TextFieldProps) {
    const [draft, setDraft] = useState<string | null>(null);
    const suggestionsId = useId();
    const textarea = useRef<HTMLTextAreaElement>(null);
    const input = useRef<HTMLInputElement>(null);

    // The editor grows with its content, so text wraps instead of scrolling
    useLayoutEffect(() => {
        const editor = textarea.current;
        if (draft === null || !editor) {
            return;
        }
        editor.style.height = 'auto';
        const borders = editor.offsetHeight - editor.clientHeight;
        editor.style.height = `${editor.scrollHeight + borders}px`;
    }, [draft]);

    const commit = () => {
        if (draft !== null && draft !== value) {
            onChange(draft);
        }
        setDraft(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            setDraft(null);
        }
        if (event.key === 'Enter' && !(multiline && event.shiftKey)) {
            event.preventDefault();
            commit();
        }
    };

    if (draft === null) {
        return (
            <button
                type="button"
                className={styles.field}
                aria-label={label}
                onClick={() => setDraft(value)}
            >
                {value || (
                    <span className={styles.placeholder}>{placeholder}</span>
                )}
            </button>
        );
    }

    const editorProps = {
        className: `${styles.field} ${styles.editing}`,
        'aria-label': label,
        placeholder,
        value: draft,
        autoFocus: true,
        onFocus: placeCaretAtEnd,
        onChange: (event: { target: { value: string } }) =>
            setDraft(
                multiline
                    ? event.target.value
                    : event.target.value.replace(/\r?\n/g, ' '),
            ),
        onKeyDown,
        onBlur: commit,
    };
    if (!suggestions.length) {
        return <textarea {...editorProps} ref={textarea} rows={1} />;
    }
    return (
        <span className={styles.withSuggestions}>
            <input {...editorProps} ref={input} list={suggestionsId} />
            <button
                type="button"
                className={styles.suggestionsButton}
                aria-label="Show suggestions"
                tabIndex={-1}
                // Keeps the focus in the editor, which would otherwise commit on blur
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => input.current?.showPicker()}
            >
                <SuggestionsIcon aria-hidden />
            </button>
            <datalist id={suggestionsId}>
                {suggestions.map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                ))}
            </datalist>
        </span>
    );
}

/** Moves the caret after the last character of the focused field. */
function placeCaretAtEnd(event: {
    target: HTMLInputElement | HTMLTextAreaElement;
}) {
    const end = event.target.value.length;
    event.target.setSelectionRange(end, end);
}
