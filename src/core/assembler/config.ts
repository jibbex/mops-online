/**
 * Mnemonic configuration for the MOPS assembler.
 *
 * Canonical instruction identifiers never change. Only their displayed and
 * accepted mnemonics are configurable.
 *
 * @module core/assembler/config
 */

import { INSTRUCTION_IDS, ISA, type InstructionId } from '@/core/isa';

/** Complete mapping from canonical instruction IDs to source mnemonics. */
export type MnemonicConfig = Readonly<Record<InstructionId, string>>;

/** One validation problem in a mnemonic configuration. */
export interface MnemonicConfigIssue {
    readonly instruction?: InstructionId;
    readonly message: string;
}

/** Raised when a mnemonic configuration is invalid. */
export class MnemonicConfigError extends Error {
    readonly issues: readonly MnemonicConfigIssue[];

    constructor(issues: readonly MnemonicConfigIssue[]) {
        super(
            `Invalid mnemonic configuration: ${issues.map((issue) => issue.message).join('; ')}`,
        );
        this.name = 'MnemonicConfigError';
        this.issues = issues;
    }
}

/**
 * Returns the default canonical mnemonics.
 */
/**
 * Returns the canonical default mnemonic for every instruction.
 *
 * @returns A fresh configuration object.
 */
export function createDefaultMnemonicConfig(): MnemonicConfig {
    return Object.fromEntries(
        INSTRUCTION_IDS.map((id) => [id, ISA[id].mnemonic]),
    ) as MnemonicConfig;
}

/** Canonical mnemonic set used when no overrides are supplied. */
export const DEFAULT_MNEMONICS = createDefaultMnemonicConfig();

/**
 * Creates and validates a mnemonic configuration.
 *
 * Mnemonics must contain one to ten lowercase ASCII letters and must be unique.
 *
 * @param overrides Partial mnemonic overrides.
 * @throws {MnemonicConfigError} When the resulting configuration is invalid.
 */
export function createMnemonicConfig(
    overrides: Partial<Record<InstructionId, string>> = {},
): MnemonicConfig {
    const candidates = {
        ...DEFAULT_MNEMONICS,
        ...overrides,
    } as Record<InstructionId, string>;

    const issues: MnemonicConfigIssue[] = [];
    const owners = new Map<string, InstructionId>();

    for (const id of INSTRUCTION_IDS) {
        const mnemonic = candidates[id];

        if (!/^[a-z]{1,10}$/.test(mnemonic)) {
            issues.push({
                instruction: id,
                message: `Mnemonic for "${id}" must contain 1 to 10 lowercase letters.`,
            });
            continue;
        }

        const owner = owners.get(mnemonic);

        if (owner !== undefined) {
            issues.push({
                instruction: id,
                message: `Mnemonic "${mnemonic}" is already used by "${owner}".`,
            });
            continue;
        }

        owners.set(mnemonic, id);
    }

    if (issues.length > 0) {
        throw new MnemonicConfigError(issues);
    }

    return candidates;
}

/**
 * Resolves a source mnemonic to its canonical instruction identifier.
 *
 * @param mnemonic The mnemonic as written in source.
 * @param config The active mnemonic configuration.
 */
export function resolveMnemonic(
    mnemonic: string,
    config: MnemonicConfig,
): InstructionId | undefined {
    return INSTRUCTION_IDS.find((id) => config[id] === mnemonic);
}
