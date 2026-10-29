/**
 * MOPS tokenizer for the CodeMirror editor.
 *
 * The tokenizer is a pure stream function so every token class can be tested
 * without mounting CodeMirror or relying on browser layout.
 *
 * @module components/mops-tokenizer
 */

import type { StringStream } from '@codemirror/language';

/**
 * Returns the syntax token at the current stream position.
 *
 * @param stream CodeMirror stream positioned at the next token.
 */
export function tokenizeMopsLine(stream: StringStream): string | null {
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
}
