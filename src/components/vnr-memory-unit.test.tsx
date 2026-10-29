import { LanguageProvider } from '@/i18n/i18n-provider';
import type { VisualOperation } from '@/player/visual-map';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { VnrMemoryUnit } from './vnr-memory-unit';

const INACTIVE = () => false;
const ACTIVE = () => true;
const NO_OPERATION = (): VisualOperation | undefined => undefined;
const READ_OPERATION = (): VisualOperation | undefined => 'read';

function renderUnit(
    memory: readonly number[],
    active: (id: string) => boolean,
    operation: (id: string) => VisualOperation | undefined,
) {
    return render(
        <LanguageProvider>
            <svg>
                <VnrMemoryUnit
                    memory={memory}
                    active={active}
                    operation={operation}
                />
            </svg>
        </LanguageProvider>,
    );
}

afterEach(cleanup);

describe('VnrMemoryUnit', () => {
    it('renders the inactive unit with zero-filled fallback cells', () => {
        const { container } = renderUnit([], INACTIVE, NO_OPERATION);

        expect(container.querySelector('[data-operation]')).toBeNull();
        expect(container.textContent).toContain('00000');
    });

    it('renders active cells with their operation', () => {
        const { container } = renderUnit(
            Array<number>(72).fill(0),
            ACTIVE,
            READ_OPERATION,
        );

        expect(
            container.querySelectorAll('[data-operation="read"]').length,
        ).toBeGreaterThan(0);
    });
});
