/**
 * Assembler diagnostics and warnings.
 *
 * @module components/diagnostics
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useI18n } from '@/i18n/i18n-context';
import { translateDiagnostic } from '@/i18n/messages';
import { usePlayer } from '@/player/player';
import type { ReactElement } from 'react';

/**
 * Renders assembler diagnostics and warnings.
 *
 * @returns The diagnostics element, or null when there are no messages.
 */
export function Diagnostics(): ReactElement | null {
    const { language, t } = useI18n();
    const diagnostics = usePlayer((state) => state.diagnostics);
    const warnings = usePlayer((state) => state.warnings);
    const messages = [...diagnostics, ...warnings];

    if (messages.length === 0) {
        return null;
    }

    const hasError = messages.some((message) => message.severity === 'error');

    return (
        <Alert
            variant={hasError ? 'destructive' : 'default'}
            className="max-h-32 shrink-0"
        >
            <AlertTitle>{t('diagnostics.title')}</AlertTitle>
            <AlertDescription>
                <ScrollArea className="h-20">
                    <div className="flex flex-col gap-1">
                        {messages.map((message, index) => (
                            <span
                                key={`${message.line}-${message.code}-${index}`}
                            >
                                {t('diagnostics.line', {
                                    line: message.line,
                                    message: translateDiagnostic(
                                        language,
                                        message.code,
                                        message.message,
                                    ),
                                })}
                            </span>
                        ))}
                    </div>
                </ScrollArea>
            </AlertDescription>
        </Alert>
    );
}
