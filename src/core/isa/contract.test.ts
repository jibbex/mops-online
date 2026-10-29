// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { assemble } from '@/core/assembler';
import {
    INSTRUCTIONS,
    ISA,
    getOpcode,
    type InstructionSpec,
    type OperandMode,
} from './index';

/**
 * Builds the smallest valid source program for one instruction and mode.
 *
 * Conditional jumps need a preceding comparison, and numeric targets point at
 * the terminating `end` line. Keeping this helper next to the contract test
 * makes the generated source easy to audit when the ISA changes.
 */
function sourceFor(
    instruction: InstructionSpec,
    mode: OperandMode,
): { source: string; line: number } {
    if (mode === 'none') {
        return { source: instruction.mnemonic, line: 1 };
    }

    if (mode === 'target') {
        const needsCompare = instruction.requiresCompare === true;
        const prefix = needsCompare ? 'cmp 0\n' : '';
        const instructionLine = needsCompare ? 2 : 1;
        const targetLine = needsCompare ? 3 : 2;

        return {
            source: `${prefix}${instruction.mnemonic} #${targetLine}\nend`,
            line: instructionLine,
        };
    }

    const operand = mode === 'address' ? 'a' : '1';

    return {
        source: `${instruction.mnemonic} ${operand}\nend`,
        line: 1,
    };
}

describe('ISA contract', () => {
    it('encodes every declared opcode through the assembler', () => {
        for (const instruction of INSTRUCTIONS) {
            for (const mode of Object.keys(
                instruction.opcodes,
            ) as OperandMode[]) {
                const expected = getOpcode(instruction.id, mode);
                const { source, line } = sourceFor(instruction, mode);
                const result = assemble(source);

                expect(
                    result.diagnostics,
                    `${instruction.id} ${mode}: ${source}`,
                ).toHaveLength(0);
                expect(result.program).toBeDefined();

                const entry = result.program?.listing.find(
                    (item) => item.line === line,
                );

                expect(entry?.words[0], `${instruction.id} ${mode}`).toBe(
                    expected,
                );
            }
        }
    });

    it('keeps terminal instructions out of the execution table', () => {
        expect(ISA.end.terminates).toBe(true);
        expect(ISA.end.execution.none).toEqual([{ kind: 'HALT' }]);
    });
});
