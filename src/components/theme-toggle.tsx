/**
 * Theme menu for the application header.
 *
 * @module components/theme-toggle
 */

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/i18n/i18n-context';
import { Moon, Sun } from 'lucide-react';
import type { ReactElement } from 'react';
import { useTheme, type Theme } from './theme-context';

/**
 * Renders the appearance selector.
 *
 * @returns The theme menu trigger and content.
 */
export function ThemeToggle(): ReactElement {
    const { theme, setTheme } = useTheme();
    const { t } = useI18n();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('header.theme')}
                >
                    {theme === 'dark' ? <Moon /> : <Sun />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>
                        {t('theme.appearance')}
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                        value={theme}
                        onValueChange={(value) => setTheme(value as Theme)}
                    >
                        <DropdownMenuRadioItem value="light">
                            {t('theme.light')}
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="dark">
                            {t('theme.dark')}
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="system">
                            {t('theme.system')}
                        </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
