/**
 * Language selector for the application header.
 *
 * @module components/language-toggle
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
import type { Language } from '@/i18n/messages';
import { Languages } from 'lucide-react';
import type { ReactElement } from 'react';

/**
 * Renders the language menu.
 *
 * @returns The language menu trigger and content.
 */
export function LanguageToggle(): ReactElement {
    const { language, setLanguage, t } = useI18n();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('header.language')}
                >
                    <Languages />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>{t('language.label')}</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                        value={language}
                        onValueChange={(value) =>
                            setLanguage(value as Language)
                        }
                    >
                        <DropdownMenuRadioItem value="en">
                            {t('language.en')}
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="de">
                            {t('language.de')}
                        </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
