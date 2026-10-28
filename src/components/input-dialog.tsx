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
    const player = usePlayer();
    const [value, setValue] = useState('');
    const [invalid, setInvalid] = useState(false);
    const open = player.status === 'waiting-input';

    useEffect(() => {
        if (open) {
            setValue('');
            setInvalid(false);
        }
    }, [open]);

    const submit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const parsed = Number.parseInt(value, 10);

        if (!Number.isInteger(parsed) || parsed < -9999 || parsed > 9999) {
            setInvalid(true);
            return;
        }

        setInvalid(false);
        player.provideInput(parsed);
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
                                min={-9999}
                                max={9999}
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
