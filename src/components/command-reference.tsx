/**
 * Command reference dialog.
 *
 * The table is derived from the canonical ISA so the reference cannot drift
 * from the assembler or VM.
 *
 * @module components/command-reference
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { INSTRUCTIONS, type OperandMode } from '@/core/isa';
import { useI18n, type Translate } from '@/i18n/i18n-context';
import type { MessageKey } from '@/i18n/messages';
import { BookOpen } from 'lucide-react';
import type { ReactElement } from 'react';

const OPERAND_KEYS: Record<OperandMode, MessageKey> = {
    address: 'reference.address',
    immediate: 'reference.immediate',
    target: 'reference.target',
    none: 'reference.none',
};

/**
 * Returns the localized operand form for an instruction.
 *
 * @param mnemonic Source mnemonic.
 * @param modes Supported operand modes.
 * @param t Active translator.
 * @returns A readable syntax summary.
 */
function operandForms(
    mnemonic: string,
    modes: readonly OperandMode[],
    t: Translate,
): string {
    if (modes.length === 1 && modes[0] === 'none') {
        return t('reference.none');
    }

    return modes
        .map((mode) => `${mnemonic} ${t(OPERAND_KEYS[mode])}`)
        .join(' | ');
}

/**
 * Renders the instruction reference trigger and dialog.
 *
 * @returns The command reference dialog.
 */
export function CommandReference(): ReactElement {
    const { t } = useI18n();

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost">
                    <BookOpen data-icon="inline-start" />
                    {t('reference.trigger')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{t('reference.title')}</DialogTitle>
                    <DialogDescription>
                        {t('reference.description')}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('reference.mnemonic')}</TableHead>
                                <TableHead>{t('reference.operands')}</TableHead>
                                <TableHead>{t('reference.opcode')}</TableHead>
                                <TableHead>
                                    {t('reference.descriptionColumn')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {INSTRUCTIONS.map((instruction) => {
                                const modes = Object.keys(
                                    instruction.opcodes,
                                ) as OperandMode[];
                                const opcodes = Object.values(
                                    instruction.opcodes,
                                ).sort((left, right) => left - right);

                                return (
                                    <TableRow key={instruction.id}>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {instruction.mnemonic}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {operandForms(
                                                instruction.mnemonic,
                                                modes,
                                                t,
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {opcodes.join(' · ')}
                                        </TableCell>
                                        <TableCell>
                                            {t(
                                                `instruction.${instruction.id}` as MessageKey,
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
