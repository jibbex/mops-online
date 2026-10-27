/**
 * Theme and accent menu for the application header.
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Moon, Palette, Sun } from 'lucide-react';
import type { ReactElement } from 'react';
import { useTheme, type Accent, type Theme } from './theme-context';

/**
 * Renders the appearance and accent selector.
 *
 * @returns The theme menu trigger and content.
 */
export function ThemeToggle(): ReactElement {
    const { theme, accent, setTheme, setAccent } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Theme settings">
                    {theme === 'dark' ? (
                        <Moon data-icon="inline-start" />
                    ) : (
                        <Sun data-icon="inline-start" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                        value={theme}
                        onValueChange={(value) => setTheme(value as Theme)}
                    >
                        <DropdownMenuRadioItem value="light">
                            Light
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="dark">
                            Dark
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="system">
                            System
                        </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="flex items-center gap-2">
                        <Palette />
                        Accent
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                        value={accent}
                        onValueChange={(value) => setAccent(value as Accent)}
                    >
                        <DropdownMenuRadioItem value="blue">
                            Blue
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="emerald">
                            Emerald
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="violet">
                            Violet
                        </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
