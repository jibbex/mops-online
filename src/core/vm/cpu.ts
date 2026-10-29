/**
 * CPU state for the MOPS virtual machine.
 *
 * @module core/vm/cpu
 */

import {
    getInstructionByOpcode,
    getOperandModeForOpcode,
    isOpcode,
    type Opcode,
    type Operation,
} from '@/core/isa';
import type { Address, ObjectProgram, Word } from '@/core/object';
import type { Compare, MicroOp, Phase } from './microops';
import type { Trap } from './traps';

/** Decoded instruction register. */
export interface BranchRegister {
    /** Opcode, or null before the first fetch completes. */
    readonly opcode: Opcode | null;
    readonly operand: Word;
}

/** Internal latch value; fetch uses a two-cell tuple. */
export type BusValue = Word | readonly [Word, Word];

/** Complete machine state after a microcycle. */
export interface CpuState {
    /** Complete memory image. */
    readonly memory: readonly Word[];
    /** Program counter: the instruction index, not a memory address. */
    readonly pc: Address;
    /** Memory address of the instruction currently being processed. */
    readonly instructionAddress: Address;
    /**
     * Start addresses of every instruction, indexed by program counter.
     *
     * Instructions are variable-width in memory, so the PC cannot be used
     * directly as an address. This table keeps the counter at one increment per
     * instruction while the fetch address stays correct.
     */
    readonly instructionAddresses: readonly Address[];
    /** Maps instruction start addresses back to program-counter indices. */
    readonly addressToPc: ReadonlyMap<Address, number>;
    /** Decoded instruction register. */
    readonly br: BranchRegister;
    /** Accumulator. */
    readonly ac: Word;
    /** Operand latch used by the ALU. */
    readonly op: Word;
    /** Visible operation symbol. */
    readonly ar: string;
    /** Operation selected for the current execute phase. */
    readonly operation: Operation | null;
    /** ALU result. */
    readonly erg: Word;
    /** Last comparison result. */
    readonly vgl: Compare;
    /** Input register. */
    readonly ein: Word;
    /** Output register. */
    readonly aus: Word;
    /** Decoded instruction text for display. */
    readonly decoded: string;
    /** Internal address latch. */
    readonly slAdr: Address;
    /** Internal value latch. */
    readonly slVal: BusValue;
    /** Memory latch. */
    readonly mlVal: BusValue;
    /** Current machine phase. */
    readonly phase: Phase;
    /** Micro-ops remaining in the current phase. */
    readonly queue: readonly MicroOp[];
    /** Next micro-op index in {@link queue}. */
    readonly queueIndex: number;
    /** Whether the machine has reached `end`. */
    readonly halted: boolean;
    /** Runtime trap, if the machine stopped abnormally. */
    readonly trap: Trap | null;
}

/** One executed microcycle and the state transition it caused. */
export interface VmEvent {
    /** Phase active before the micro-op ran. */
    readonly phase: Phase;
    /** Address of the instruction being processed. */
    readonly address: Address;
    /** Instruction opcode, if decode has completed. */
    readonly opcode: Opcode | null;
    /** Instruction operand, if decode has completed. */
    readonly operand: Word | null;
    readonly microOp: MicroOp;
    readonly before: CpuState;
    readonly after: CpuState;
    /** Short English description for the UI. */
    readonly description: string;
}

/**
 * Result of one VM step.
 *
 * `input-required` leaves the input micro-op pending so the caller can retry it
 * with a value.
 */
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
    const instructionAddresses = collectInstructionAddresses(program);
    const addressToPc = new Map(
        instructionAddresses.map((address, index) => [address, index]),
    );

    return {
        memory: [...program.memory],
        pc: 0,
        instructionAddress: program.entry,
        instructionAddresses,
        addressToPc,
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
 * Collects instruction start addresses in execution order.
 *
 * The machine stores two-cell instructions, so the program counter is an
 * instruction index rather than a byte address. The table is derived from the
 * object program instead of being stored separately by the assembler.
 *
 * @param program Object program loaded into the machine.
 */
function collectInstructionAddresses(
    program: ObjectProgram,
): readonly Address[] {
    const addresses: Address[] = [];
    let address = program.entry;

    while (address >= 0 && address < program.memory.length) {
        addresses.push(address);

        const opcode = program.memory[address];

        if (opcode === undefined || !isOpcode(opcode)) {
            break;
        }

        const instruction = getInstructionByOpcode(opcode);

        if (instruction.terminates) {
            break;
        }

        const wordCount = getOperandModeForOpcode(opcode) === 'none' ? 1 : 2;
        address += wordCount;
    }

    return addresses;
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
