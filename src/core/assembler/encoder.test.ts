// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { DEFAULT_MNEMONICS } from './config';
import { encodeProgram } from './encoder';
import { parseSource } from './line-parser';
import { scanSource } from './line-scanner';
import { collectSymbols } from './symbols';

function encode(source: string) {
    const parsed = parseSource(scanSource(source), DEFAULT_MNEMONICS);

    expect(parsed.diagnostics).toHaveLength(0);

    const symbols = collectSymbols(parsed.lines);

    expect(symbols.diagnostics).toHaveLength(0);

    return encodeProgram(parsed.lines, symbols.labels);
}

function codes(source: string): string[] {
    return encode(source).diagnostics.map((diagnostic) => diagnostic.code);
}

describe('encodeProgram', () => {
    it('encodes instructions, listing, and source map', () => {
        const result = encode('ld 5\nst a\nend');

        expect(result.memory.slice(0, 5)).toEqual([11, 5, 12, 64, 60]);
        expect(result.sourceMap.slice(0, 5)).toEqual([1, 1, 2, 2, 3]);
        expect(result.listing).toEqual([
            { line: 1, address: 0, words: [11, 5], source: 'ld 5' },
            { line: 2, address: 2, words: [12, 64], source: 'st a' },
            { line: 3, address: 4, words: [60], source: 'end' },
        ]);
        expect(result.entry).toBe(0);
        expect(result.endAddress).toBe(4);
        expect(result.diagnostics).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
    });

    it('resolves label and line-number jump targets', () => {
        const labelResult = encode('jmp done\nld 5\nout 1 :done\nend');

        expect(labelResult.memory[1]).toBe(4);
        expect(labelResult.symbols.get('done')).toBe(4);

        const lineResult = encode('jmp #4\nld 5\nld 6\nout 1\nend');

        expect(lineResult.memory[1]).toBe(6);
    });

    it('encodes data aliases and negative immediates', () => {
        const result = encode('ld a\nld $71\nld -5\nend');

        expect(result.memory.slice(0, 7)).toEqual([10, 64, 10, 71, 11, -5, 60]);
    });

    it('reports a missing end on the last source line', () => {
        const result = encode('ld 5\nld 6');

        expect(result.endAddress).toBeUndefined();
        expect(result.diagnostics).toContainEqual(
            expect.objectContaining({ code: 'missing-end', line: 2 }),
        );
    });

    it('reports a missing end for empty source', () => {
        const result = encode('');

        expect(result.endAddress).toBeUndefined();
        expect(result.diagnostics).toContainEqual(
            expect.objectContaining({
                code: 'missing-end',
                line: 1,
                length: 0,
            }),
        );
    });

    it('ignores labels after the terminating instruction', () => {
        const result = encode('end\nld 5 :late');

        expect(result.symbols.has('late')).toBe(false);
        expect(result.warnings).toContainEqual(
            expect.objectContaining({ code: 'code-after-end', line: 2 }),
        );
    });

    it('warns about instructions after end', () => {
        const result = encode('end\nld 5');

        expect(result.endAddress).toBe(0);
        expect(result.warnings).toContainEqual(
            expect.objectContaining({ code: 'code-after-end', line: 2 }),
        );
    });

    it('warns about unused labels', () => {
        const result = encode('ld 5 :unused\nld 6\nend');

        expect(result.symbols.get('unused')).toBe(0);
        expect(result.warnings).toContainEqual(
            expect.objectContaining({ code: 'unused-label', line: 1 }),
        );
    });

    it('does not warn about used labels', () => {
        const result = encode('jmp done\nld 5 :done\nend');

        expect(result.symbols.get('done')).toBe(2);
        expect(result.warnings.map((warning) => warning.code)).not.toContain(
            'unused-label',
        );
    });

    it('reports undefined and non-instruction jump targets', () => {
        expect(codes('jmp missing\nend')).toContain('undefined-jump-target');
        expect(codes('jmp #2\n\nend')).toContain('invalid-jump-target');
    });

    it('reports instruction and end overflow separately', () => {
        const instructionOverflow = encode(
            [...Array<string>(33).fill('ld 0'), 'end'].join('\n'),
        );

        expect(instructionOverflow.endAddress).toBeUndefined();
        expect(
            instructionOverflow.diagnostics.map(
                (diagnostic) => diagnostic.code,
            ),
        ).toContain('program-overflow');

        const endOverflow = encode(
            [...Array<string>(32).fill('ld 0'), 'end'].join('\n'),
        );

        expect(endOverflow.endAddress).toBeUndefined();
        expect(
            endOverflow.diagnostics.map((diagnostic) => diagnostic.code),
        ).toContain('program-overflow');
    });

    it('reports a conditional jump without a preceding compare', () => {
        expect(codes('jlt done\nend :done')).toContain(
            'conditional-without-compare',
        );
        expect(codes('cmp 1\njlt done\nend :done')).not.toContain(
            'conditional-without-compare',
        );
    });

    it('reports invalid addresses and operands', () => {
        expect(codes('st 5\nend')).toContain('invalid-address');
        expect(codes('st $00\nend')).toContain('invalid-address');
        expect(codes('st $99\nend')).toContain('invalid-address');
        expect(codes('ld nope\nend')).toContain('invalid-operand');
    });

    it('reports operand ranges for encoder diagnostics', () => {
        const cases = [
            ['st 5\nend', 'invalid-address', 3, 1],
            ['ld nope\nend', 'invalid-operand', 3, 4],
            ['jmp #100\nend', 'invalid-line-target', 4, 4],
            ['jmp 1\nend', 'invalid-jump-target', 4, 1],
            ['jmp #2\n\nend', 'invalid-jump-target', 4, 2],
        ] as const;

        for (const [source, code, column, length] of cases) {
            const diagnostic = encode(source).diagnostics.find(
                (candidate) => candidate.code === code,
            );

            expect(diagnostic).toMatchObject({ code, column, length });
        }
    });
});
