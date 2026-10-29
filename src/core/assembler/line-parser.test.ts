// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { DEFAULT_MNEMONICS, createMnemonicConfig } from './config';
import { parseSource } from './line-parser';
import { scanSource } from './line-scanner';

function parse(source: string, config = DEFAULT_MNEMONICS) {
    return parseSource(scanSource(source), config);
}

describe('line parser', () => {
    it('parses a mnemonic and operand', () => {
        const result = parse('ld 5');

        expect(result.diagnostics).toHaveLength(0);
        expect(result.lines).toHaveLength(1);
        expect(result.lines[0]?.instruction).toEqual({
            id: 'ld',
            operand: '5',
            mnemonicColumn: 0,
            operandColumn: 3,
        });
    });

    it('parses a trailing label', () => {
        const result = parse('st a :loop');

        expect(result.diagnostics).toHaveLength(0);
        expect(result.lines[0]?.label).toBe('loop');
        expect(result.lines[0]?.instruction).toEqual({
            id: 'st',
            operand: 'a',
            mnemonicColumn: 0,
            operandColumn: 3,
        });
    });

    it('rejects a label without an instruction', () => {
        const result = parse(':loop');

        expect(result.lines).toHaveLength(0);
        expect(result.diagnostics[0]?.code).toBe('label-without-instruction');
    });

    it('rejects an empty label name', () => {
        const result = parse('ld 5 :');

        expect(result.lines).toHaveLength(0);
        expect(result.diagnostics[0]?.code).toBe('empty-label');
    });

    it('rejects invalid label names', () => {
        const result = parse('ld 5 :1loop');

        expect(result.lines).toHaveLength(0);
        expect(result.diagnostics[0]?.code).toBe('invalid-label');
    });

    it('rejects unknown mnemonics', () => {
        const result = parse('xyz 5');

        expect(result.lines).toHaveLength(0);
        expect(result.diagnostics[0]?.code).toBe('unknown-mnemonic');
    });

    it('rejects missing operands', () => {
        const result = parse('ld');

        expect(result.lines).toHaveLength(1);
        expect(result.diagnostics[0]?.code).toBe('missing-operand');
    });

    it('rejects an operand on end', () => {
        const result = parse('end 1');

        expect(result.diagnostics[0]?.code).toBe('end-with-operand');
    });

    it('reports indented instructions but still parses them', () => {
        const result = parse('  ld 5');

        expect(result.lines).toHaveLength(1);
        expect(result.diagnostics[0]?.code).toBe('indentation');
        expect(result.lines[0]?.instruction.mnemonicColumn).toBe(2);
        expect(result.lines[0]?.instruction.operandColumn).toBe(5);
    });

    it('reports token ranges for parser diagnostics', () => {
        const cases = [
            ['zz 5 :loop', 'unknown-mnemonic', 0, 2],
            ['ld :loop', 'missing-operand', 8, 0],
            ['end 1 :loop', 'end-with-operand', 4, 1],
            ['ld 5 :1loop', 'invalid-label', 6, 5],
            ['ld 5 :', 'empty-label', 6, 0],
        ] as const;

        for (const [source, code, column, length] of cases) {
            const diagnostic = parse(source).diagnostics[0];

            expect(diagnostic).toMatchObject({ code, column, length });
        }
    });

    it('uses a custom mnemonic configuration', () => {
        const config = createMnemonicConfig({ ld: 'lade' });
        const result = parse('lade 5', config);

        expect(result.diagnostics).toHaveLength(0);
        expect(result.lines[0]?.instruction.id).toBe('ld');
    });

    it('parses multiple lines', () => {
        const result = parse('ld 5\nadd 1\nend');

        expect(result.lines).toHaveLength(3);
        expect(result.lines.map((line) => line.instruction.id)).toEqual([
            'ld',
            'add',
            'end',
        ]);
    });
});
