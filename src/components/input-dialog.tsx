/**
 * Input prompt while the VM waits for a value.
 *
 * @module components/input-dialog
 */

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { MAX_WORD, MIN_WORD, isWord } from '@/core/object';
import { useI18n } from '@/i18n/i18n-context';
import { usePlayer } from '@/player/player';
import { useEffect, useState, type FormEvent, type ReactElement } from 'react';

/**
 * Renders the input dialog.
 *
 * @returns The input dialog element.
 */
export function InputDialog(): ReactElement {
    const { t } = useI18n();
    const status = usePlayer((state) => state.status);
    const provideInput = usePlayer((state) => state.provideInput);
    const [value, setValue] = useState('');
    const [invalid, setInvalid] = useState(false);
    const open = status === 'waiting-input';

    useEffect(() => {
        if (open) {
            setValue('');
            setInvalid(false);
        }
    }, [open]);

    const submit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const parsed = Number.parseInt(value, 10);

        if (!isWord(parsed)) {
            setInvalid(true);
            return;
        }

        setInvalid(false);
        provideInput(parsed);
    };

    return (
        <Dialog open={open} onOpenChange={() => undefined}>
            <DialogContent showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>{t('input.title')}</DialogTitle>
                    <DialogDescription>
                        {t('input.description')}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="flex flex-col gap-4">
                    <FieldGroup>
                        <Field data-invalid={invalid}>
                            <FieldLabel htmlFor="input-value">
                                {t('input.label')}
                            </FieldLabel>
                            <Input
                                id="input-value"
                                type="number"
                                min={MIN_WORD}
                                max={MAX_WORD}
                                value={value}
                                aria-invalid={invalid}
                                onChange={(event) => {
                                    setValue(event.target.value);
                                    setInvalid(false);
                                }}
                                autoFocus
                            />
                            {invalid ? (
                                <FieldDescription className="text-destructive">
                                    {t('input.invalid')}
                                </FieldDescription>
                            ) : (
                                <FieldDescription>
                                    {t('input.validRange')}
                                </FieldDescription>
                            )}
                        </Field>
                    </FieldGroup>
                    <DialogFooter>
                        <Button type="submit">{t('input.submit')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
