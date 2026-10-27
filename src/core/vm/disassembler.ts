/**
 * Disassembler for MOPS machine code.
 *
 * @module core/vm/disassembler
 */

import {
    findInstructionByOpcode,
    getOperandModeForOpcode,
    isOpcode,
    type Opcode,
} from '@/core/isa';
import type { Address, Word } from '@/core/object';

/** One decoded memory location or instruction. */
export interface DisassembledInstruction {
    readonly address: Address;
    readonly opcode: Opcode | null;
    readonly operand: Word | null;
    /** Human-readable mnemonic or `.word` fallback. */
    readonly text: string;
}

/**
 * Disassembles the program area of a memory image.
 *
 * @param memory The memory image.
 * @param start First address to disassemble.
 */
export function disassemble(
    memory: readonly Word[],
    start: Address = 0,
): DisassembledInstruction[] {
    const instructions: DisassembledInstruction[] = [];
    let address = start;

    while (address < memory.length) {
        const opcode = memory[address];

        if (!isOpcode(opcode)) {
            instructions.push({
                address,
                opcode: null,
                operand: opcode ?? 0,
                text: `.word ${opcode ?? 0}`,
            });
            address += 1;
            continue;
        }

        const instruction = findInstructionByOpcode(opcode);

        if (!instruction) {
            instructions.push({
                address,
                opcode,
                operand: null,
                text: `.word ${opcode}`,
            });
            address += 1;
            continue;
        }

        const mode = getOperandModeForOpcode(opcode);
        const operand = mode === 'none' ? null : (memory[address + 1] ?? 0);

        instructions.push({
            address,
            opcode,
            operand,
            text: formatInstruction(instruction.mnemonic, mode, operand),
        });

        address += mode === 'none' ? 1 : 2;

        if (opcode === 60) {
            break;
        }
    }

    return instructions;
}

function formatInstruction(
    mnemonic: string,
    mode: 'address' | 'immediate' | 'target' | 'none',
    operand: Word | null,
): string {
    switch (mode) {
        case 'address':
            return `${mnemonic} $${operand ?? 0}`;
        case 'immediate':
            return `${mnemonic} ${operand ?? 0}`;
        case 'target':
            return `${mnemonic} #${operand ?? 0}`;
        case 'none':
            return mnemonic;
    }
}
