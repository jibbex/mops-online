import { readStoredValue, useTheme } from '@/components/theme-context';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('useTheme', () => {
    it('rejects use outside the provider', () => {
        expect(() => renderHook(() => useTheme())).toThrow(
            'useTheme must be used within ThemeProvider.',
        );
    });
});

describe('readStoredValue', () => {
    it('falls back when storage is unavailable', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('Storage is blocked.');
        });

        expect(readStoredValue('key', ['light', 'dark'], 'light')).toBe(
            'light',
        );
    });
});
