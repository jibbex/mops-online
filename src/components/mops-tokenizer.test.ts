// @vitest-environment node

import { StringStream } from '@codemirror/language';
import { describe, expect, it } from 'vitest';
import { tokenizeMopsLine } from './mops-tokenizer';

const TAB_SIZE = 4;
const INDENT_UNIT = 4;

function tokenize(line: string): {
    readonly token: string | null;
    readonly position: number;
} {
    const stream = new StringStream(line, TAB_SIZE, INDENT_UNIT);
    const token = tokenizeMopsLine(stream);

    return { token, position: stream.pos };
}

describe('tokenizeMopsLine', () => {
    it('skips leading whitespace before the next token', () => {
        const stream = new StringStream('  ld', TAB_SIZE, INDENT_UNIT);

        expect(tokenizeMopsLine(stream)).toBeNull();
        expect(tokenizeMopsLine(stream)).toBe('keyword');
        expect(stream.pos).toBe(4);
    });

    it('recognizes comments to the end of the line', () => {
        expect(tokenize('; a comment')).toEqual({
            token: 'comment',
            position: 11,
        });
    });

    it('recognizes trailing labels', () => {
        expect(tokenize(':loop')).toEqual({
            token: 'variableName',
            position: 5,
        });
    });

    it('recognizes hexadecimal-style addresses', () => {
        expect(tokenize('$64')).toEqual({ token: 'number', position: 3 });
    });

    it('recognizes line targets', () => {
        expect(tokenize('#4')).toEqual({ token: 'number', position: 2 });
    });

    it('recognizes signed and unsigned numbers', () => {
        expect(tokenize('-12')).toEqual({ token: 'number', position: 3 });
        expect(tokenize('12')).toEqual({ token: 'number', position: 2 });
    });

    it('recognizes mnemonics', () => {
        expect(tokenize('add')).toEqual({ token: 'keyword', position: 3 });
    });

    it('advances over unknown characters', () => {
        expect(tokenize('@')).toEqual({ token: null, position: 1 });
    });

    it('handles empty and whitespace-only lines', () => {
        expect(tokenize('')).toEqual({ token: null, position: 0 });
        expect(tokenize('   ')).toEqual({ token: null, position: 3 });
    });
});
