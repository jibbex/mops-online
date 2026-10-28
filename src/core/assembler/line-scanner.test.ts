// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { scanSource } from './line-scanner';

describe('line scanner', () => {
    it('skips blank lines and comments', () => {
        const lines = scanSource('\n; comment\nld 5\n\n');

        expect(lines).toHaveLength(1);
        expect(lines[0]?.number).toBe(3);
        expect(lines[0]?.code).toBe('ld 5');
    });

    it('keeps line numbers aligned with the source', () => {
        const lines = scanSource('; one\n\nld 5\nadd 1\nend');

        expect(lines.map((line) => line.number)).toEqual([3, 4, 5]);
    });

    it('normalizes CRLF and tabs', () => {
        const lines = scanSource('ld\t5\r\nadd\t1\r\nend\r\n');

        expect(lines.map((line) => line.code)).toEqual([
            'ld 5',
            'add 1',
            'end',
        ]);
    });

    it('lowercases the parsed code but preserves the raw line', () => {
        const lines = scanSource('LD   5');

        expect(lines[0]?.code).toBe('ld   5');
        expect(lines[0]?.raw).toBe('LD   5');
    });

    it('detects indented instructions', () => {
        const lines = scanSource('  ld 5\nld 6');

        expect(lines[0]?.indented).toBe(true);
        expect(lines[1]?.indented).toBe(false);
    });

    it('allows indented comments', () => {
        const lines = scanSource('   ; a comment\nld 5');

        expect(lines).toHaveLength(1);
        expect(lines[0]?.code).toBe('ld 5');
    });

    it('strips comments after instructions', () => {
        const lines = scanSource('ld 5 ; load five');

        expect(lines[0]?.code).toBe('ld 5');
        expect(lines[0]?.raw).toBe('ld 5 ; load five');
    });
});
