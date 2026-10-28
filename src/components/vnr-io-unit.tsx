/**
 * Input/output unit of the von Neumann diagram.
 *
 * @module components/vnr-io-unit
 */

import type { CpuState } from '@/core/vm';
import { useI18n } from '@/i18n/i18n-context';
import { formatWord } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ReactElement } from 'react';

/**
 * Renders the input and output registers.
 *
 * @param cpu Current CPU state, or null before assembly.
 * @param active Returns whether a diagram element is active.
 * @returns The input/output unit element.
 */
export function VnrIoUnit({
    cpu,
    active,
}: {
    readonly cpu: CpuState | null;
    readonly active: (id: string) => boolean;
}): ReactElement {
    const { t } = useI18n();

    return (
        <g
            className={cn(
                'diagram-unit',
                'unit-io',
                active('io') && 'is-active',
            )}
        >
            <text className="diagram-title" x="391" y="400" textAnchor="middle">
                {t('diagram.inputOutput')}
            </text>
            <rect
                className="unit-frame"
                x="309"
                y="417"
                width="165"
                height="38.4"
                rx="2"
            />
            <text className="diagram-label" x="367.5" y="437">
                {t('diagram.outputRegister')}
            </text>
            <g
                id="aus"
                className={cn('diagram-register', active('aus') && 'is-active')}
            >
                <rect x="325" y="429" width="37" height="16" rx="1" />
                <text
                    className="diagram-text diagram-value"
                    x="343.5"
                    y="440"
                    textAnchor="middle"
                    fontSize="8"
                >
                    {formatWord(cpu?.aus ?? 0)}
                </text>
            </g>

            <rect
                className="unit-frame"
                x="309"
                y="456"
                width="165"
                height="38.4"
                rx="2"
            />
            <text className="diagram-label" x="367.5" y="476">
                {t('diagram.inputRegister')}
            </text>
            <g
                id="ein"
                className={cn('diagram-register', active('ein') && 'is-active')}
            >
                <rect x="325" y="467" width="37" height="16" rx="1" />
                <text
                    className="diagram-text diagram-value"
                    x="343.5"
                    y="478"
                    textAnchor="middle"
                    fontSize="8"
                >
                    {formatWord(cpu?.ein ?? 0)}
                </text>
            </g>
        </g>
    );
}
