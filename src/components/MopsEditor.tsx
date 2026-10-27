import { StreamLanguage } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { useEffect, useRef } from 'react';

interface MopsEditorProps {
    readonly value: string;
    readonly onChange: (value: string) => void;
}

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

const editorTheme = EditorView.theme({
    '&': {
        height: '100%',
        fontSize: '13px',
    },
    '.cm-scroller': {
        fontFamily: 'var(--font-mono)',
        lineHeight: '1.6',
    },
    '.cm-content': {
        padding: '12px 0',
    },
});

export function MopsEditor({ value, onChange }: MopsEditorProps) {
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
                    editorTheme,
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

    return (
        <div
            ref={containerRef}
            className="h-full min-h-[320px] overflow-hidden rounded-md border bg-white"
            aria-label="Assembly source editor"
        />
    );
}
