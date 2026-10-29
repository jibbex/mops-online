/**
 * Output confirmation dialog.
 *
 * @module components/output-dialog
 */

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useI18n } from '@/i18n/i18n-context';
import { formatWord } from '@/lib/format';
import { usePlayer } from '@/player/player';
import type { ReactElement } from 'react';
import { useShallow } from 'zustand/react/shallow';

/**
 * Renders the output dialog.
 *
 * @returns The output dialog element.
 */
export function OutputDialog(): ReactElement {
    const { t } = useI18n();
    const { status, lastOutput, acknowledgeOutput } = usePlayer(
        useShallow((state) => ({
            status: state.status,
            lastOutput: state.lastOutput,
            acknowledgeOutput: state.acknowledgeOutput,
        })),
    );
    const open = status === 'waiting-output';

    return (
        <Dialog open={open}>
            <DialogContent showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>{t('output.title')}</DialogTitle>
                    <DialogDescription>
                        {t('output.description')}
                    </DialogDescription>
                </DialogHeader>
                <div className="rounded-lg border bg-muted/40 px-4 py-6 text-center">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t('output.label')}
                    </p>
                    <p
                        className="font-mono text-3xl font-semibold tabular-nums"
                        data-testid="output-value"
                    >
                        {formatWord(lastOutput ?? 0)}
                    </p>
                </div>
                <DialogFooter>
                    <Button onClick={acknowledgeOutput}>
                        {t('output.continue')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
