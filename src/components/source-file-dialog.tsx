/**
 * Source file dialog.
 *
 * Exports the assembly source as a plain `.asm` file for Moodle uploads and
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
    buildSourceExport,
    downloadTextFile,
    MAX_SOURCE_FILE_KIB,
    readSourceFile,
    type SourceImportFailureReason,
} from '@/lib/exchange';
import type { TaskInfo } from '@/lib/task';
import { CheckCircle2, Download, FileCode2, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type ReactElement } from 'react';

interface SourceFileDialogProps {
    readonly task: TaskInfo;
    readonly source: string;
    readonly onImport: (source: string) => void;
}

type ImportStatus =
    | { readonly kind: 'idle' }
    | { readonly kind: 'success' }
    | { readonly kind: 'error'; readonly reason: SourceImportFailureReason };

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
    const [status, setStatus] = useState<ImportStatus>({ kind: 'idle' });
    // Reading is asynchronous; disabling the picker prevents a second file
    // from racing the first one and overwriting its result.
    const [busy, setBusy] = useState(false);

    const exportSource = (): void => {
        const exported = buildSourceExport(task, source);

        downloadTextFile(exported.filename, exported.text, exported.mimeType);
    };

    const importFile = async (file: File): Promise<void> => {
        setBusy(true);

        const result = await readSourceFile(file);

        if (!result.ok) {
            setStatus({ kind: 'error', reason: result.reason });
            setBusy(false);
            return;
        }

        onImport(result.text);
        setStatus({ kind: 'success' });
        setBusy(false);
    };

    const importErrorMessage = (reason: SourceImportFailureReason): string => {
        switch (reason) {
            case 'empty':
                return t('file.importEmpty');
            case 'too-large':
                return t('file.importTooLarge', {
                    max: MAX_SOURCE_FILE_KIB,
                });
            case 'unreadable':
                return t('file.importUnreadable');
            case 'binary':
                return t('file.importBinary');
        }
    };

    const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const file = event.currentTarget.files?.[0];
        // Clearing the value lets the same file be selected again after a
        // validation error; the File object is already captured above.
        event.currentTarget.value = '';

        if (!file) {
            return;
        }

        void importFile(file);
    };

    return (
        <Dialog
            onOpenChange={(open) => {
                // The next visit starts clean; a stale success or error alert
                // would otherwise look like the result of the new selection.
                if (!open) {
                    setStatus({ kind: 'idle' });
                    setBusy(false);
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
                        {t('file.importHint', { max: MAX_SOURCE_FILE_KIB })}
                    </p>
                    <input
                        ref={fileInput}
                        type="file"
                        accept=".asm,.txt,text/plain"
                        className="sr-only"
                        aria-label={t('file.choose')}
                        onChange={onFileChange}
                    />
                    <Button
                        variant="outline"
                        className="justify-start"
                        onClick={() => fileInput.current?.click()}
                        disabled={busy}
                    >
                        <Upload data-icon="inline-start" />
                        {busy ? t('file.reading') : t('file.choose')}
                    </Button>
                </section>

                {status.kind === 'success' ? (
                    <Alert>
                        <CheckCircle2 />
                        <AlertTitle>{t('file.importSection')}</AlertTitle>
                        <AlertDescription>
                            {t('file.imported')}
                        </AlertDescription>
                    </Alert>
                ) : null}
                {status.kind === 'error' ? (
                    <Alert variant="destructive">
                        <AlertTitle>{t('file.importErrorTitle')}</AlertTitle>
                        <AlertDescription>
                            {importErrorMessage(status.reason)}
                        </AlertDescription>
                    </Alert>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
