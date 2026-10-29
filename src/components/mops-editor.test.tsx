import type { Diagnostic } from '@/core/assembler';
import { LanguageProvider } from '@/i18n/i18n-provider';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MopsEditor } from './mops-editor';

const ERROR: Diagnostic = {
    line: 1,
    column: 0,
    length: 2,
    severity: 'error',
    code: 'unknown-mnemonic',
    message: 'Unknown instruction.',
};

const WARNING: Diagnostic = {
    line: 2,
    column: 0,
    length: 1,
    severity: 'warning',
    code: 'unused-label',
    message: 'Unused label.',
};

function renderEditor(
    value = 'ld 1\nend',
    onChange = vi.fn(),
    options: {
        diagnostics?: readonly Diagnostic[];
        warnings?: readonly Diagnostic[];
        currentLine?: number;
    } = {},
) {
    return render(
        <LanguageProvider>
            <MopsEditor
                value={value}
                onChange={onChange}
                diagnostics={options.diagnostics ?? []}
                warnings={options.warnings ?? []}
                currentLine={options.currentLine}
            />
        </LanguageProvider>,
    );
}

describe('MopsEditor', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('renders the controlled source', () => {
        renderEditor();

        expect(screen.getByRole('textbox')).toHaveTextContent('ld 1');
        expect(
            screen.getByLabelText('Assembly source editor'),
        ).toBeInTheDocument();
    });

    it('reports document changes', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        renderEditor('ld 1\nend', onChange);

        await user.click(document.querySelector('.cm-content') as HTMLElement);
        await user.keyboard('x');

        expect(onChange).toHaveBeenCalled();
        expect(onChange.mock.calls.at(-1)?.[0]).toContain('x');
    });

    it('updates when the controlled value changes', () => {
        const { rerender } = renderEditor('ld 1\nend');

        rerender(
            <LanguageProvider>
                <MopsEditor
                    value={'add 2\nend'}
                    onChange={vi.fn()}
                    diagnostics={[]}
                    warnings={[]}
                />
            </LanguageProvider>,
        );

        expect(screen.getByRole('textbox')).toHaveTextContent('add 2');
    });

    it('measures and scrolls when a hidden pane becomes visible', () => {
        let resize: (() => void) | undefined;
        const disconnect = vi.fn();

        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(callback: () => void) {
                    resize = callback;
                }

                observe(): void {
                    // Visibility is driven by the test below.
                }

                disconnect(): void {
                    disconnect();
                }
            },
        );

        const { container, unmount } = renderEditor('ld 1\nend', vi.fn(), {
            currentLine: 1,
        });
        const editorContainer = container.firstElementChild as HTMLElement;

        expect(resize).toBeDefined();

        Object.defineProperty(editorContainer, 'clientHeight', {
            configurable: true,
            value: 20,
        });
        resize?.();

        unmount();
        expect(disconnect).toHaveBeenCalled();
    });

    it('marks error, warning, and current lines', async () => {
        renderEditor('ld 1\nend', vi.fn(), {
            diagnostics: [ERROR],
            warnings: [WARNING],
            currentLine: 2,
        });

        await waitFor(() => {
            expect(document.querySelector('.cm-error-line')).not.toBeNull();
            expect(document.querySelector('.cm-warning-line')).not.toBeNull();
            expect(document.querySelector('.cm-current-line')).not.toBeNull();
        });
    });
});
