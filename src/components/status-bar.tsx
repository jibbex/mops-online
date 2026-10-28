/**
 * Compact machine status summary.
 *
 * @module components/status-bar
 */

import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useI18n } from '@/i18n/i18n-context';
import { translateTrap, type MessageKey } from '@/i18n/messages';
import { formatAddress, formatWord } from '@/lib/format';
import { cn } from '@/lib/utils';
import { usePlayer, type PlayerStatus } from '@/player/player';
import type { ReactElement } from 'react';
import { useShallow } from 'zustand/react/shallow';

const STATUS_KEYS: Record<PlayerStatus, MessageKey> = {
    idle: 'status.idle',
    ready: 'status.ready',
    running: 'status.running',
    paused: 'status.paused',
    'waiting-input': 'status.waiting-input',
    'waiting-output': 'status.waiting-output',
    finished: 'status.finished',
    error: 'status.error',
};

/**
 * Renders the machine status card.
 *
 * @param currentLine Source line associated with the last machine event.
 * @param className Additional layout classes.
 * @returns The status card element.
 */
export function StatusBar({
    currentLine,
    className,
}: {
    readonly currentLine?: number;
    readonly className?: string;
}): ReactElement {
    const { language, t } = useI18n();
    const { status, cpu, trap } = usePlayer(
        useShallow((state) => ({
            status: state.status,
            cpu: state.cpu,
            trap: state.trap,
        })),
    );

    return (
        <Card size="sm" className={cn('app-card shrink-0', className)}>
            <CardHeader>
                <CardTitle>{t('status.title')}</CardTitle>
                <CardDescription className="hidden sm:block">
                    {t('status.description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 wide:grid wide:grid-cols-2 wide:items-center wide:gap-x-3 wide:gap-y-1.5">
                <StatusValue
                    id="status"
                    label={t('status.status')}
                    value={t(STATUS_KEYS[status])}
                    accent={status === 'error'}
                />
                <StatusValue
                    id="phase"
                    label={t('status.phase')}
                    value={cpu?.phase ?? '—'}
                />
                <StatusValue
                    id="bz"
                    label={t('status.bz')}
                    value={formatAddress(cpu?.bz ?? 0)}
                />
                <StatusValue
                    id="ac"
                    label={t('status.ac')}
                    value={formatWord(cpu?.ac ?? 0)}
                />
                <StatusValue
                    id="aus"
                    label={t('status.aus')}
                    value={formatWord(cpu?.aus ?? 0)}
                />
                <StatusValue
                    id="line"
                    label={t('status.line')}
                    value={currentLine ? String(currentLine) : '—'}
                />
                <StatusValue
                    id="decoded"
                    label={t('status.decoded')}
                    value={cpu?.decoded || '—'}
                />
                {trap ? (
                    <Badge variant="destructive">
                        {trap.code}:{' '}
                        {translateTrap(language, trap.code, trap.message)}
                    </Badge>
                ) : null}
            </CardContent>
        </Card>
    );
}

/**
 * Renders one labelled status value.
 *
 * @param id Stable test identifier.
 * @param label Visible status label.
 * @param value Formatted status value.
 * @param accent Whether the value uses the destructive accent.
 * @returns The status value element.
 */
function StatusValue({
    id,
    label,
    value,
    accent = false,
}: {
    readonly id: string;
    readonly label: string;
    readonly value: string;
    readonly accent?: boolean;
}): ReactElement {
    return (
        <span className="flex items-center gap-1.5 wide:contents">
            <Badge variant="outline" className="wide:w-full wide:justify-start">
                {label}
            </Badge>
            <Badge
                variant={accent ? 'destructive' : 'secondary'}
                className="wide:w-full wide:justify-start"
                data-testid={`status-${id}`}
            >
                {value}
            </Badge>
        </span>
    );
}
