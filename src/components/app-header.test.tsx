import { AppHeader } from '@/components/app-header';
import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/i18n/i18n-provider';
import { PRACTICE_TASK_ID } from '@/lib/task';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

function renderHeader(task: { readonly id: string; readonly title: string }) {
    return render(
        <ThemeProvider>
            <LanguageProvider>
                <AppHeader task={task} />
            </LanguageProvider>
        </ThemeProvider>,
    );
}

beforeEach(() => {
    localStorage.clear();
});

afterEach(cleanup);

describe('AppHeader', () => {
    it('shows the task identifier when a task has no title', () => {
        renderHeader({ id: '42', title: '' });

        expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('hides the task badge in practice mode', () => {
        renderHeader({ id: PRACTICE_TASK_ID, title: '' });

        expect(screen.queryByText('Free practice')).toBeNull();
    });
});
