/**
 * Arithmetic logic unit of the von Neumann diagram.
 *
 * @module components/vnr-alu-unit
 */

import type { CpuState } from '@/core/vm';
import { useI18n } from '@/i18n/i18n-context';
import { formatWord } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ReactElement } from 'react';

/**
 * Renders the ALU and its registers.
 *
 * @param cpu Current CPU state, or null before assembly.
 * @param active Returns whether a diagram element is active.
 * @returns The ALU unit element.
 */
export function VnrAluUnit({
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
                'unit-alu',
                active('alu') && 'is-active',
            )}
        >
            <rect
                className="unit-frame"
                x="309"
                y="230"
                width="180"
                height="138"
                rx="2"
            />
            <text className="diagram-title" x="399" y="220" textAnchor="middle">
                {t('diagram.alu')}
            </text>

            <text className="diagram-label" x="343" y="257">
                {t('diagram.operand')}
            </text>
            <g
                id="op"
                className={cn('diagram-register', active('op') && 'is-active')}
            >
                <rect x="343" y="262" width="37" height="16" rx="1" />
                <text
                    className="diagram-text diagram-value"
                    x="361.5"
                    y="273"
                    textAnchor="middle"
                    fontSize="8"
                >
                    {formatWord(cpu?.op ?? 0)}
                </text>
            </g>

            <text className="diagram-label" x="417" y="257">
                {t('diagram.accumulator')}
            </text>
            <g
                id="ac"
                className={cn('diagram-register', active('ac') && 'is-active')}
            >
                <rect x="417" y="262" width="37" height="16" rx="1" />
                <text
                    className="diagram-text diagram-value"
                    x="435.5"
                    y="273"
                    textAnchor="middle"
                    fontSize="8"
                >
                    {formatWord(cpu?.ac ?? 0)}
                </text>
            </g>

            <polygon
                className="diagram-triangle"
                points="380.2,278.2 398.7,302.2 380.2,326.2 417.2,326.2 398.7,302.2 417.2,278.2"
            />
            <g
                id="ar"
                className={cn('diagram-register', active('ar') && 'is-active')}
            >
                <rect x="392" y="294" width="13" height="16" rx="1" />
                <text
                    className="diagram-text diagram-value"
                    x="398.5"
                    y="305"
                    textAnchor="middle"
                    fontSize="8"
                >
                    {cpu?.ar || '?'}
                </text>
            </g>

            <text className="diagram-label" x="343" y="352">
                {t('diagram.compare')}
            </text>
            <g
                id="vgl"
                className={cn('diagram-register', active('vgl') && 'is-active')}
            >
                <rect x="343" y="326" width="13" height="16" rx="1" />
                <text
                    className="diagram-text diagram-value"
                    x="349.5"
                    y="337"
                    textAnchor="middle"
                    fontSize="8"
                >
                    {cpu?.vgl || '—'}
                </text>
            </g>

            <text className="diagram-label" x="380" y="352">
                {t('diagram.result')}
            </text>
            <g
                id="erg"
                className={cn('diagram-register', active('erg') && 'is-active')}
            >
                <rect x="380" y="326" width="37" height="16" rx="1" />
                <text
                    className="diagram-text diagram-value"
                    x="398.5"
                    y="337"
                    textAnchor="middle"
                    fontSize="8"
                >
                    {formatWord(cpu?.erg ?? 0)}
                </text>
            </g>
        </g>
    );
}
