import { createCpu } from '@/core/vm';
import { LanguageProvider } from '@/i18n/i18n-provider';
import type { VisualOperation } from '@/player/visual-map';
import { createObjectProgramFixture } from '@/test/object-program-fixture';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { VnrAluUnit } from './vnr-alu-unit';

const INACTIVE = () => false;
const ACTIVE = () => true;
const NO_OPERATION = (): VisualOperation | undefined => undefined;
const READ_OPERATION = (): VisualOperation | undefined => 'read';
const PROGRAM = createObjectProgramFixture();

function renderUnit(
    cpu: ReturnType<typeof createCpu> | null,
    active: (id: string) => boolean,
    operation: (id: string) => VisualOperation | undefined,
) {
    return render(
        <LanguageProvider>
            <svg>
                <VnrAluUnit cpu={cpu} active={active} operation={operation} />
            </svg>
        </LanguageProvider>,
    );
}

afterEach(cleanup);

describe('VnrAluUnit', () => {
    it('renders the inactive unit without a CPU', () => {
        const { container } = renderUnit(null, INACTIVE, NO_OPERATION);

        expect(container.querySelector('[data-operation]')).toBeNull();
        expect(container.textContent).toContain('?');
        expect(container.textContent).toContain('—');
    });

    it('renders active registers with their operation', () => {
        const { container } = renderUnit(
            createCpu(PROGRAM),
            ACTIVE,
            READ_OPERATION,
        );

        expect(
            container.querySelectorAll('[data-operation="read"]').length,
        ).toBeGreaterThan(0);
    });
});
