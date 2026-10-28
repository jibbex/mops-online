/**
 * Source file dialog.
 *
 * Exports the assembly source as a plain `.ass` file for Moodle uploads and
 * imports a previously downloaded file back into the editor.
 *
 * @module components/source-file-dialog
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@/i18n/i18n-context';
import {
    downloadTextFile,
    SOURCE_MIME_TYPE,
    sourceFilename,
} from '@/lib/exchange';
import type { TaskInfo } from '@/lib/task';
import { CheckCircle2, Download, FileCode2, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type ReactElement } from 'react';

interface SourceFileDialogProps {
    readonly task: TaskInfo;
    readonly source: string;
    readonly onImport: (source: string) => void;
}

type ImportStatus = 'idle' | 'success' | 'error';

/**
 * Renders the source file export and import dialog.
 *
 * @param props Task metadata, current source, and importer.
 * @returns The file dialog trigger and content.
 */
export function SourceFileDialog({
    task,
    source,
    onImport,
}: SourceFileDialogProps): ReactElement {
    const { t } = useI18n();
    const fileInput = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<ImportStatus>('idle');

    const exportSource = (): void => {
        downloadTextFile(
            sourceFilename(task),
            `${source.trimEnd()}\n`,
            SOURCE_MIME_TYPE,
        );
    };

    const importFile = async (file: File): Promise<void> => {
        try {
            const text = await file.text();

            if (text.trim().length === 0) {
                setStatus('error');
                return;
            }

            onImport(text.replaceAll('\r\n', '\n'));
            setStatus('success');
        } catch {
            setStatus('error');
        }
    };

    const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';

        if (!file) {
            return;
        }

        void importFile(file);
    };

    return (
        <Dialog
            onOpenChange={(open) => {
                if (!open) {
                    setStatus('idle');
                }
            }}
        >
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="outline"
                    aria-label={t('file.trigger')}
                >
                    <FileCode2 data-icon="inline-start" />
                    <span className="hidden sm:inline">
                        {t('file.trigger')}
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('file.title')}</DialogTitle>
                    <DialogDescription>
                        {t('file.description')}
                    </DialogDescription>
                </DialogHeader>

                <Button
                    className="h-auto justify-start py-2"
                    onClick={exportSource}
                >
                    <Download data-icon="inline-start" />
                    <span className="flex flex-col items-start">
                        <span>{t('file.download')}</span>
                        <span className="text-xs font-normal opacity-80">
                            {t('file.downloadHint')}
                        </span>
                    </span>
                </Button>

                <Separator />

                <section className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium">
                        {t('file.importSection')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {t('file.importHint')}
                    </p>
                    <input
                        ref={fileInput}
                        type="file"
                        accept=".ass,.txt,text/plain"
                        className="sr-only"
                        aria-label={t('file.choose')}
                        onChange={onFileChange}
                    />
                    <Button
                        variant="outline"
                        className="justify-start"
                        onClick={() => fileInput.current?.click()}
                    >
                        <Upload data-icon="inline-start" />
                        {t('file.choose')}
                    </Button>
                </section>

                {status === 'success' ? (
                    <Alert>
                        <CheckCircle2 />
                        <AlertTitle>{t('file.importSection')}</AlertTitle>
                        <AlertDescription>
                            {t('file.imported')}
                        </AlertDescription>
                    </Alert>
                ) : null}
                {status === 'error' ? (
                    <Alert variant="destructive">
                        <AlertTitle>{t('file.importSection')}</AlertTitle>
                        <AlertDescription>
                            {t('file.importFailed')}
                        </AlertDescription>
                    </Alert>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
