import { useTheme } from '@/components/theme-context';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('useTheme', () => {
    it('rejects use outside the provider', () => {
        expect(() => renderHook(() => useTheme())).toThrow(
            'useTheme must be used within ThemeProvider.',
        );
    });
});
