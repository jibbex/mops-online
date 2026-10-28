/**
 * Product header with task context, reference, language, and theme controls.
 *
 * @module components/app-header
 */

import { CommandReference } from '@/components/command-reference';
import { LanguageToggle } from '@/components/language-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n/i18n-context';
import { isTaskContext, PRACTICE_TASK_ID, type TaskInfo } from '@/lib/task';
import { ClipboardList, Cpu } from 'lucide-react';
import type { ReactElement } from 'react';

/**
 * Renders the product header.
 *
 * @param task Task metadata read from the page URL.
 * @returns The header element.
 */
export function AppHeader({ task }: { readonly task: TaskInfo }): ReactElement {
    const { t } = useI18n();
    const taskName =
        task.title ||
        (task.id === PRACTICE_TASK_ID ? t('task.practice') : task.id);

    return (
        <header className="app-header flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:gap-3 sm:px-4">
            <span className="brand-mark" aria-hidden="true">
                <Cpu />
            </span>
            <div className="flex min-w-0 flex-col justify-center">
                <h1 className="brand-title text-lg leading-none font-semibold tracking-tight">
                    MOPS
                </h1>
                <p className="mt-1 hidden truncate text-xs leading-none text-muted-foreground sm:block">
                    {t('app.subtitle')}
                </p>
            </div>
            {isTaskContext(task) ? (
                <Badge
                    variant="outline"
                    className="ml-1 hidden max-w-64 sm:inline-flex"
                >
                    <ClipboardList data-icon="inline-start" />
                    <span className="truncate">{taskName}</span>
                </Badge>
            ) : null}
            <div className="ml-auto flex items-center gap-1">
                <CommandReference />
                <LanguageToggle />
                <ThemeToggle />
            </div>
        </header>
    );
}
