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

    return `${mnemonic} ${modes
        .map((mode) => t(OPERAND_KEYS[mode]))
        .join('|')}`;
}

/**
 * Renders the instruction reference trigger and dialog.
 *
 * @returns The command reference dialog.
 */
export function CommandReference(): ReactElement {
    const { t } = useI18n();
    const instructions = INSTRUCTIONS.map((instruction) => ({
        id: instruction.id,
        mnemonic: instruction.mnemonic,
        forms: operandForms(
            instruction.mnemonic,
            Object.keys(instruction.opcodes) as OperandMode[],
            t,
        ),
        opcodes: Object.values(instruction.opcodes).sort(
            (left, right) => left - right,
        ),
    }));

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost">
                    <BookOpen data-icon="inline-start" />
                    {t('reference.trigger')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-5xl">
                <DialogHeader>
                    <DialogTitle>{t('reference.title')}</DialogTitle>
                    <DialogDescription>
                        {t('reference.description')}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="[&_[data-slot=scroll-area-viewport]]:max-h-[60dvh]">
                    <ul className="flex flex-col gap-3 pr-3 sm:hidden">
                        {instructions.map((instruction) => (
                            <li
                                key={instruction.id}
                                className="flex flex-col gap-1.5 border-b pb-3 last:border-b-0 last:pb-0"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <Badge variant="secondary">
                                        {instruction.mnemonic}
                                    </Badge>
                                    <span className="font-mono text-xs text-muted-foreground">
                                        {instruction.opcodes.join(' · ')}
                                    </span>
                                </div>
                                <p className="font-mono text-xs break-words">
                                    {instruction.forms}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {t(
                                        `instruction.${instruction.id}` as MessageKey,
                                    )}
                                </p>
                            </li>
                        ))}
                    </ul>
                    <div className="hidden sm:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        {t('reference.mnemonic')}
                                    </TableHead>
                                    <TableHead>
                                        {t('reference.operands')}
                                    </TableHead>
                                    <TableHead>
                                        {t('reference.opcode')}
                                    </TableHead>
                                    <TableHead>
                                        {t('reference.descriptionColumn')}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {instructions.map((instruction) => (
                                    <TableRow key={instruction.id}>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {instruction.mnemonic}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs whitespace-normal">
                                            {instruction.forms}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                                            {instruction.opcodes.join(' · ')}
                                        </TableCell>
                                        <TableCell className="whitespace-normal">
                                            {t(
                                                `instruction.${instruction.id}` as MessageKey,
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
