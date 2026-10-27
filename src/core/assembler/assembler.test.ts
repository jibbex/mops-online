// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { assemble } from './index';
import { createMnemonicConfig } from './config';
import type { AssembleResult } from './diagnostics';

function assembleOk(
    source: string,
): AssembleResult & { program: NonNullable<AssembleResult['program']> } {
    const result = assemble(source);

    expect(result.diagnostics).toHaveLength(0);

    if (!result.program) {
        throw new Error('Expected a program.');
    }

    return result as AssembleResult & {
        program: NonNullable<AssembleResult['program']>;
    };
}

function codes(result: AssembleResult): string[] {
    return result.diagnostics.map((diagnostic) => diagnostic.code);
}

describe('assemble', () => {
    it('assembles a complete program', () => {
        const result = assembleOk(
            ['ld 5', 'add a', 'st b', 'out b', 'end'].join('\n'),
        );

        expect(result.program.memory.slice(0, 9)).toEqual([
            11, 5, 30, 64, 12, 65, 22, 65, 60,
        ]);
        expect(result.program.endAddress).toBe(8);
        expect(result.program.sourceMap.slice(0, 9)).toEqual([
            1, 1, 2, 2, 3, 3, 4, 4, 5,
        ]);
        expect(result.program.listing).toHaveLength(5);
        expect(result.program.listing[4]).toEqual({
            line: 5,
            address: 8,
            words: [60],
            source: 'end',
        });
    });

    it('maps aliases a through h to data addresses', () => {
        const result = assembleOk(['st a', 'st h', 'end'].join('\n'));

        expect(result.program.memory[1]).toBe(64);
        expect(result.program.memory[3]).toBe(71);
    });

    it('resolves forward labels', () => {
        const result = assembleOk(
            ['jmp done', 'ld 5', 'out 1 :done', 'end'].join('\n'),
        );

        expect(result.program.memory.slice(0, 8)).toEqual([
            50, 4, 11, 5, 23, 1, 60, 0,
        ]);
        expect(result.program.symbols.get('done')).toBe(4);
        expect(result.program.endAddress).toBe(6);
    });

    it('resolves numeric line targets', () => {
        const result = assembleOk(
            ['jmp #4', 'ld 5', 'ld 6', 'out 1', 'end'].join('\n'),
        );

        expect(result.program.memory[1]).toBe(6);
    });

    it('reports an undefined jump target', () => {
        const result = assemble('jmp missing\nend');

        expect(result.program).toBeUndefined();
        expect(codes(result)).toContain('undefined-jump-target');
    });

    it('rejects invalid line targets', () => {
        const result = assemble('jmp #100\nend');

        expect(result.program).toBeUndefined();
        expect(codes(result)).toContain('invalid-line-target');
    });

    it('requires an address for st and in', () => {
        for (const source of ['st 5', 'in 5']) {
            const result = assemble(`${source}\nend`);

            expect(result.program).toBeUndefined();
            expect(codes(result)).toContain('invalid-address');
        }
    });

    it('rejects invalid immediates', () => {
        const result = assemble('ld nope\nend');

        expect(result.program).toBeUndefined();
        expect(codes(result)).toContain('invalid-operand');
    });

    it('rejects immediates outside the word range', () => {
        const result = assemble('ld 10000\nend');

        expect(result.program).toBeUndefined();
        expect(codes(result)).toContain('invalid-operand');
    });

    it('rejects a conditional jump without cmp', () => {
        const result = assemble('jlt done\nend :done');

        expect(result.program).toBeUndefined();
        expect(codes(result)).toContain('conditional-without-compare');
    });

    it('accepts a conditional jump after cmp', () => {
        const result = assembleOk(
            ['ld 1', 'cmp 1', 'jeq done', 'ld 2', 'out 1 :done', 'end'].join(
                '\n',
            ),
        );

        expect(result.program.memory[5]).toBe(8);
        expect(result.program.memory[8]).toBe(23);
    });

    it('requires end', () => {
        const result = assemble('ld 5');

        expect(result.program).toBeUndefined();
        expect(codes(result)).toContain('missing-end');
    });

    it('warns about instructions after end', () => {
        const result = assemble('end\nld 5');

        expect(result.program).toBeDefined();
        expect(result.warnings.map((warning) => warning.code)).toContain(
            'code-after-end',
        );
    });

    it('warns about unused labels', () => {
        const result = assemble('ld 5 :unused\nld 6\nend');

        expect(result.program).toBeDefined();
        expect(result.warnings.map((warning) => warning.code)).toContain(
            'unused-label',
        );
    });

    it('rejects duplicate labels', () => {
        const result = assemble('ld 5 :loop\nend :loop');

        expect(result.program).toBeUndefined();
        expect(codes(result)).toContain('duplicate-label');
    });

    it('rejects program overflow', () => {
        const source = [...Array<string>(33).fill('ld 0'), 'end'].join('\n');
        const result = assemble(source);

        expect(result.program).toBeUndefined();
        expect(codes(result)).toContain('program-overflow');
    });

    it('supports custom mnemonics', () => {
        const config = createMnemonicConfig({
            ld: 'lade',
            end: 'ende',
        });
        const result = assemble('lade 5\nende', config);

        expect(result.diagnostics).toHaveLength(0);
        expect(result.program?.memory.slice(0, 3)).toEqual([11, 5, 60]);
    });

    it('encodes end as one cell', () => {
        const result = assembleOk('end');

        expect(result.program.listing).toEqual([
            {
                line: 1,
                address: 0,
                words: [60],
                source: 'end',
            },
        ]);
        expect(result.program.endAddress).toBe(0);
    });

    it('supports address and immediate forms', () => {
        const result = assembleOk(
            ['ld a', 'ld $64', 'ld 7', 'out 1', 'end'].join('\n'),
        );

        expect(result.program.memory.slice(0, 8)).toEqual([
            10, 64, 10, 64, 11, 7, 23, 1,
        ]);
    });
});
