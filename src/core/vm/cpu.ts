/**
 * CPU state for the MOPS virtual machine.
 *
 * @module core/vm/cpu
 */

import {
    getInstructionByOpcode,
    getOperandModeForOpcode,
    type Opcode,
    type Operation,
} from '@/core/isa';
import type { Address, ObjectProgram, Word } from '@/core/object';
import type { Compare, MicroOp, Phase } from './microops';
import type { Trap } from './traps';

export interface BranchRegister {
    readonly opcode: Opcode | null;
    readonly operand: Word;
}

export type BusValue = Word | readonly [Word, Word];

export interface CpuState {
    readonly memory: readonly Word[];
    readonly bz: Address;
    readonly instructionAddress: Address;
    readonly br: BranchRegister;
    readonly ac: Word;
    readonly op: Word;
    readonly ar: string;
    readonly operation: Operation | null;
    readonly erg: Word;
    readonly vgl: Compare;
    readonly ein: Word;
    readonly aus: Word;
    readonly decoded: string;
    readonly slAdr: Address;
    readonly slVal: BusValue;
    readonly mlVal: BusValue;
    readonly phase: Phase;
    readonly queue: readonly MicroOp[];
    readonly queueIndex: number;
    readonly halted: boolean;
    readonly trap: Trap | null;
}

export interface VmEvent {
    readonly phase: Phase;
    readonly address: Address;
    readonly opcode: Opcode | null;
    readonly operand: Word | null;
    readonly microOp: MicroOp;
    readonly before: CpuState;
    readonly after: CpuState;
    readonly description: string;
}

export type VmStepResult =
    | {
          readonly kind: 'step';
          readonly state: CpuState;
          readonly event: VmEvent;
      }
    | {
          readonly kind: 'input-required';
          readonly state: CpuState;
          readonly event: VmEvent;
      }
    | {
          readonly kind: 'trap';
          readonly state: CpuState;
          readonly trap: Trap;
          readonly event: VmEvent;
      }
    | {
          readonly kind: 'halted';
          readonly state: CpuState;
          readonly event?: VmEvent;
      };

/**
 * Creates a CPU state from an object program.
 *
 * @param program The program to load.
 */
export function createCpu(program: ObjectProgram): CpuState {
    return {
        memory: [...program.memory],
        bz: program.entry,
        instructionAddress: program.entry,
        br: { opcode: null, operand: 0 },
        ac: 0,
        op: 0,
        ar: '',
        operation: null,
        erg: 0,
        vgl: '',
        ein: 0,
        aus: 0,
        decoded: '',
        slAdr: 0,
        slVal: 0,
        mlVal: 0,
        phase: 'FETCH',
        queue: [],
        queueIndex: 0,
        halted: false,
        trap: null,
    };
}

/**
 * Returns a deep copy suitable for history snapshots and tests.
 *
 * @param state The state to copy.
 */
export function cloneCpuState(state: CpuState): CpuState {
    return {
        ...state,
        memory: [...state.memory],
        br: { ...state.br },
        slVal: cloneBusValue(state.slVal),
        mlVal: cloneBusValue(state.mlVal),
        queue: [...state.queue],
        trap: state.trap === null ? null : { ...state.trap },
    };
}

function cloneBusValue(value: BusValue): BusValue {
    return Array.isArray(value) ? [value[0], value[1]] : value;
}

/**
 * Formats the decoded instruction for display.
 *
 * @param opcode The decoded opcode.
 * @param operand The decoded operand.
 */
export function formatDecoded(opcode: Opcode, operand: Word): string {
    const instruction = getInstructionByOpcode(opcode);
    const mode = getOperandModeForOpcode(opcode);

    switch (mode) {
        case 'address':
            return `${instruction.mnemonic} $${operand}`;
        case 'immediate':
            return `${instruction.mnemonic} ${operand}`;
        case 'target':
            return `${instruction.mnemonic} #${operand}`;
        case 'none':
            return instruction.mnemonic;
    }
}
