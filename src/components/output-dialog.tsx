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

/**
 * Renders the output dialog.
 *
 * @returns The output dialog element.
 */
export function OutputDialog(): ReactElement {
    const { t } = useI18n();
    const player = usePlayer();
    const open = player.status === 'waiting-output';

    return (
        <Dialog open={open} onOpenChange={() => undefined}>
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
                        {formatWord(player.lastOutput ?? 0)}
                    </p>
                </div>
                <DialogFooter>
                    <Button onClick={player.acknowledgeOutput}>
                        {t('output.continue')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
