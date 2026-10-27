// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { DEFAULT_MNEMONICS, createMnemonicConfig } from './config';
import { parseSource } from './lineParser';
import { scanSource } from './lineScanner';

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
        });
    });

    it('parses a trailing label', () => {
        const result = parse('st a :loop');

        expect(result.diagnostics).toHaveLength(0);
        expect(result.lines[0]?.label).toBe('loop');
        expect(result.lines[0]?.instruction).toEqual({
            id: 'st',
            operand: 'a',
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
