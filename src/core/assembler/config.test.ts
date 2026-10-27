// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { INSTRUCTION_IDS } from '@/core/isa';
import {
    DEFAULT_MNEMONICS,
    MnemonicConfigError,
    createMnemonicConfig,
    resolveMnemonic,
} from './config';

describe('mnemonic configuration', () => {
    it('defines the canonical default for every instruction', () => {
        expect(Object.keys(DEFAULT_MNEMONICS)).toEqual(INSTRUCTION_IDS);
        expect(DEFAULT_MNEMONICS.ld).toBe('ld');
        expect(DEFAULT_MNEMONICS.end).toBe('end');
    });

    it('applies valid overrides', () => {
        const config = createMnemonicConfig({
            ld: 'lade',
            st: 'speichere',
        });

        expect(config.ld).toBe('lade');
        expect(config.st).toBe('speichere');
        expect(resolveMnemonic('lade', config)).toBe('ld');
        expect(resolveMnemonic('ld', config)).toBeUndefined();
    });

    it('rejects invalid mnemonic characters', () => {
        expect(() => createMnemonicConfig({ ld: 'lade1' })).toThrow(
            MnemonicConfigError,
        );
    });

    it('rejects mnemonics longer than ten characters', () => {
        expect(() => createMnemonicConfig({ ld: 'abcdefghijk' })).toThrow(
            MnemonicConfigError,
        );
    });

    it('rejects duplicate mnemonics', () => {
        expect(() => createMnemonicConfig({ ld: 'same', st: 'same' })).toThrow(
            MnemonicConfigError,
        );
    });

    it('resolves canonical mnemonics and rejects unknown values', () => {
        expect(resolveMnemonic('ld', DEFAULT_MNEMONICS)).toBe('ld');
        expect(resolveMnemonic('xyz', DEFAULT_MNEMONICS)).toBeUndefined();
    });
});
