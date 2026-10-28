/**
 * Compact application footer with the version and repository link.
 *
 * @module components/app-footer
 */

import { GithubIcon } from '@/components/github-icon';
import { useI18n } from '@/i18n/i18n-context';
import type { ReactElement } from 'react';

/**
 * Renders the application footer.
 *
 * @returns The footer element.
 */
export function AppFooter(): ReactElement {
    const { t } = useI18n();

    return (
        <footer className="text-muted-foreground flex h-7 shrink-0 items-center justify-center gap-2 border-t px-3 text-xs">
            <span>MOPS Online</span>
            <span className="font-mono" data-testid="app-version">
                v{__APP_VERSION__}
            </span>
            <span aria-hidden="true">·</span>
            <a
                href="https://github.com/jibbex/mops-online"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground inline-flex items-center gap-1"
                aria-label={t('footer.repository')}
            >
                <GithubIcon className="size-3.5" />
                <span>{t('footer.repository')}</span>
            </a>
        </footer>
    );
}
