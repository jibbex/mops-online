/**
 * CodeMirror editor for MOPS assembly source.
 *
 * The editor owns document editing only. Assembly, diagnostics, and execution
 * remain outside the editor; the parent receives every document change.
 *
 * @module components/MopsEditor
 */

import type { Diagnostic } from '@/core/assembler';
import {
    HighlightStyle,
    StreamLanguage,
    syntaxHighlighting,
} from '@codemirror/language';
import {
    EditorState,
    RangeSetBuilder,
    StateEffect,
    StateField,
} from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { basicSetup } from 'codemirror';
import { useEffect, useRef, type ReactElement } from 'react';
import { createEditorLineState, type EditorLineState } from './editorLineState';

interface MopsEditorProps {
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly diagnostics: readonly Diagnostic[];
    readonly warnings: readonly Diagnostic[];
    readonly currentLine?: number;
}

/**
 * Lightweight tokenizer for MOPS mnemonics, operands, labels, and comments.
 */
const mopsLanguage = StreamLanguage.define({
    token(stream) {
        if (stream.eatSpace()) {
            return null;
        }

        if (stream.match(';')) {
            stream.skipToEnd();
            return 'comment';
        }

        if (stream.match(/^:[a-z][a-z0-9]*/i)) {
            return 'variableName';
        }

        if (stream.match(/^\$[0-9]+/)) {
            return 'number';
        }

        if (stream.match(/^#[0-9]+/)) {
            return 'number';
        }

        if (stream.match(/^-?[0-9]+/)) {
            return 'number';
        }

        if (stream.match(/^[a-z][a-z0-9]*/i)) {
            return 'keyword';
        }

        stream.next();
        return null;
    },
});

/**
 * Syntax colors that follow the application theme tokens.
 */
const mopsHighlightStyle = HighlightStyle.define([
    {
        tag: tags.comment,
        color: 'var(--editor-comment)',
        fontStyle: 'italic',
    },
    {
        tag: [tags.keyword, tags.atom],
        color: 'var(--editor-keyword)',
        fontWeight: '600',
    },
    {
        tag: [tags.number, tags.literal],
        color: 'var(--editor-number)',
    },
    {
        tag: tags.variableName,
        color: 'var(--editor-label)',
    },
    {
        tag: tags.operator,
        color: 'var(--editor-operator)',
    },
]);

/**
 * Editor layout that follows the application's fonts and spacing.
 */
const editorTheme = EditorView.theme({
    '&': {
        height: '100%',
        fontSize: '13px',
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
    },
    '.cm-scroller': {
        fontFamily: 'var(--font-mono)',
        lineHeight: '1.6',
    },
    '.cm-content': {
        padding: '12px 0',
    },
    '.cm-gutters': {
        backgroundColor: 'var(--muted)',
        color: 'var(--muted-foreground)',
        borderRight: '1px solid var(--border)',
    },
    '.cm-activeLine, .cm-activeLineGutter': {
        backgroundColor: 'var(--accent)',
    },
    '.cm-cursor': {
        borderLeftColor: 'var(--primary)',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        backgroundColor: 'color-mix(in oklch, var(--primary) 24%, transparent)',
    },
    '.cm-current-line': {
        boxShadow: 'inset 3px 0 0 var(--primary)',
    },
    '.cm-error-line': {
        backgroundColor:
            'color-mix(in oklch, var(--destructive) 15%, transparent)',
    },
    '.cm-warning-line': {
        backgroundColor: 'color-mix(in oklch, var(--primary) 12%, transparent)',
    },
});

const setEditorLineState = StateEffect.define<EditorLineState>();

const editorLineField = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(value, transaction) {
        let next = value.map(transaction.changes);

        for (const effect of transaction.effects) {
            if (effect.is(setEditorLineState)) {
                next = buildLineDecorations(transaction.state, effect.value);
            }
        }

        return next;
    },
    provide: (field) => EditorView.decorations.from(field),
});

/**
 * Builds line decorations for the current execution line and diagnostics.
 *
 * @param state Current editor state.
 * @param lineState Lines selected for decoration.
 * @returns A decoration set for the editor.
 */
function buildLineDecorations(
    state: EditorState,
    lineState: EditorLineState,
): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    const lines = new Set<number>([
        ...lineState.errorLines,
        ...lineState.warningLines,
        ...(lineState.currentLine === undefined || lineState.currentLine === 0
            ? []
            : [lineState.currentLine]),
    ]);

    for (const lineNumber of [...lines].sort((left, right) => left - right)) {
        if (lineNumber < 1 || lineNumber > state.doc.lines) {
            continue;
        }

        const classes: string[] = [];

        if (lineState.errorLines.has(lineNumber)) {
            classes.push('cm-error-line');
        }

        if (lineState.warningLines.has(lineNumber)) {
            classes.push('cm-warning-line');
        }

        if (lineState.currentLine === lineNumber) {
            classes.push('cm-current-line');
        }

        const line = state.doc.line(lineNumber);
        builder.add(
            line.from,
            line.from,
            Decoration.line({ class: classes.join(' ') }),
        );
    }

    return builder.finish();
}

/**
 * Mounts a CodeMirror editor and keeps it synchronized with the controlled
 * value.
 *
 * @param value Current source text.
 * @param onChange Called after every document change.
 * @param diagnostics Error diagnostics to mark.
 * @param warnings Warning diagnostics to mark.
 * @param currentLine Current execution line.
 * @returns The editor container element.
 */
export function MopsEditor({
    value,
    onChange,
    diagnostics,
    warnings,
    currentLine,
}: MopsEditorProps): ReactElement {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    const initialValueRef = useRef(value);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        if (!containerRef.current) {
            return;
        }

        const view = new EditorView({
            state: EditorState.create({
                doc: initialValueRef.current,
                extensions: [
                    basicSetup,
                    mopsLanguage,
                    syntaxHighlighting(mopsHighlightStyle),
                    editorTheme,
                    editorLineField,
                    EditorState.tabSize.of(4),
                    EditorView.lineWrapping,
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged) {
                            onChangeRef.current(update.state.doc.toString());
                        }
                    }),
                ],
            }),
            parent: containerRef.current,
        });

        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = null;
        };
    }, []);

    useEffect(() => {
        const view = viewRef.current;

        if (!view) {
            return;
        }

        const current = view.state.doc.toString();

        if (current !== value) {
            view.dispatch({
                changes: {
                    from: 0,
                    to: current.length,
                    insert: value,
                },
            });
        }
    }, [value]);

    useEffect(() => {
        const view = viewRef.current;

        if (!view) {
            return;
        }

        view.dispatch({
            effects: setEditorLineState.of(
                createEditorLineState(currentLine, diagnostics, warnings),
            ),
        });
    }, [currentLine, diagnostics, warnings]);

    return (
        <div
            ref={containerRef}
            className="h-full min-h-0 overflow-hidden bg-background"
            aria-label="Assembly source editor"
        />
    );
}
