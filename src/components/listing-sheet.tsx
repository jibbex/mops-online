/**
 * Assembler listing in a side sheet.
 *
 * @module components/listing-sheet
 */

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useI18n } from '@/i18n/i18n-context';
import { formatAddress, formatWord } from '@/lib/format';
import { usePlayer } from '@/player/player';
import { Code2 } from 'lucide-react';
import type { ReactElement } from 'react';

/**
 * Renders the assembler listing.
 *
 * @returns The listing trigger and sheet content.
 */
export function ListingSheet(): ReactElement {
    const { t } = useI18n();
    const program = usePlayer((state) => state.program);
    const listing = program?.listing ?? [];

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    size="sm"
                    variant="outline"
                    disabled={!program}
                    aria-label={t('listing.trigger')}
                >
                    <Code2 data-icon="inline-start" />
                    <span className="hidden sm:inline">
                        {t('listing.trigger')}
                    </span>
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-2xl">
                <SheetHeader>
                    <SheetTitle>{t('listing.title')}</SheetTitle>
                    <SheetDescription>
                        {t('listing.description')}
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-8rem)] px-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('listing.addr')}</TableHead>
                                <TableHead>{t('listing.code')}</TableHead>
                                <TableHead>{t('listing.source')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {listing.map((entry) => (
                                <TableRow
                                    key={`${entry.address}-${entry.line}`}
                                >
                                    <TableCell>
                                        {formatAddress(entry.address)}
                                    </TableCell>
                                    <TableCell>
                                        {entry.words.map(formatWord).join(' ')}
                                    </TableCell>
                                    <TableCell>{entry.source}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
