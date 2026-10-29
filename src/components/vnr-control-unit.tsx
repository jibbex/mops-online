/**
 * Control unit of the von Neumann diagram.
 *
 * @module components/vnr-control-unit
 */

import type { CpuState } from '@/core/vm';
import { useI18n } from '@/i18n/i18n-context';
import { formatAddress, formatWord } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { VisualOperation } from '@/player/visual-map';
import type { ReactElement } from 'react';

/**
 * Renders the control unit and its registers.
 *
 * @param cpu Current CPU state, or null before assembly.
 * @param pc Current program counter.
 * @param active Returns whether a diagram element is active.
 * @param operation Returns the read/write/increment operation for an element.
 * @returns The control unit element.
 */
export function VnrControlUnit({
    cpu,
    pc,
    active,
    operation,
}: {
    readonly cpu: CpuState | null;
    readonly pc: number;
    readonly active: (id: string) => boolean;
    readonly operation: (id: string) => VisualOperation | undefined;
}): ReactElement {
    const { t } = useI18n();

    return (
        <g
            data-tour="control-unit"
            className={cn(
                'diagram-unit',
                'unit-control',
                active('control') && 'is-active',
            )}
        >
            <rect
                className="unit-frame"
                x="309"
                y="27"
                width="180"
                height="155"
                rx="2"
            />
            <rect
                className="unit-head"
                x="325"
                y="43"
                width="148"
                height="32"
                rx="1"
            />
            <text className="diagram-title" x="399" y="14" textAnchor="middle">
                {t('diagram.controlUnit')}
            </text>
            <text className="diagram-title" x="399" y="63" textAnchor="middle">
                {t('diagram.controlLogic')}
            </text>

            <text className="diagram-label" x="325" y="100">
                {t('diagram.instructionCounter')}
            </text>
            <g
                id="pc"
                data-tour="pc"
                className={cn('diagram-register', active('pc') && 'is-active')}
                data-operation={operation('pc')}
            >
                <rect x="421" y="91" width="19" height="16" rx="1" />
                <text
                    className="diagram-text diagram-value"
                    x="430.5"
                    y="102"
                    textAnchor="middle"
                    fontSize="8"
                >
                    {formatAddress(pc)}
                </text>
            </g>

            <text className="diagram-label" x="325" y="127">
                {t('diagram.instructionRegister')}
            </text>
            <g
                id="br"
                data-tour="br"
                className={cn('diagram-register', active('br') && 'is-active')}
                data-operation={operation('br')}
            >
                <rect x="421" y="118" width="19" height="16" rx="1" />
                <rect x="440" y="118" width="37" height="16" rx="1" />
                <text
                    className="diagram-text diagram-value"
                    x="430.5"
                    y="129"
                    textAnchor="middle"
                    fontSize="8"
                >
                    {formatAddress(cpu?.br.opcode ?? 0)}
                </text>
                <text
                    className={cn(
                        'diagram-text diagram-value',
                        active('br-op') && 'diagram-active-text',
                    )}
                    x="458.5"
                    y="129"
                    textAnchor="middle"
                    fontSize="8"
                >
                    {formatWord(cpu?.br.operand ?? 0)}
                </text>
            </g>

            <text className="diagram-label" x="325" y="160">
                {t('diagram.decoder')}
            </text>
            <g
                id="dek"
                className={cn('diagram-register', active('dek') && 'is-active')}
                data-operation={operation('dek')}
            >
                <rect x="325" y="147" width="148" height="23" rx="1" />
                <text
                    className="diagram-text diagram-value"
                    x="330"
                    y="162"
                    fontSize="8"
                >
                    {cpu?.decoded || '—'}
                </text>
            </g>
        </g>
    );
}
