/**
 * User-facing translations.
 *
 * English is the source language. German overrides the same keys, while
 * diagnostic and trap translations are resolved by stable codes so core
 * messages remain language-neutral.
 *
 * @module i18n/messages
 */

export type Language = 'en' | 'de';

const en = {
    'app.subtitle': 'Von Neumann model computer',
    'app.description': 'A web-based von Neumann model computer.',
    'header.reference': 'Command reference',
    'header.language': 'Language settings',
    'header.theme': 'Theme settings',
    'task.label': 'Task',
    'task.practice': 'Free practice',
    'task.unknown': 'Moodle task',
    'toolbar.assemble': 'Assemble',
    'toolbar.start': 'Start',
    'toolbar.pause': 'Pause',
    'toolbar.step': 'Step',
    'toolbar.back': 'Back',
    'toolbar.stop': 'Stop',
    'toolbar.listing': 'Listing',
    'toolbar.file': 'File',
    'settings.label': 'Run settings',
    'mode.label': 'Mode',
    'mode.micro': 'Micro',
    'mode.phases': 'Phases',
    'mode.commands': 'Commands',
    'mode.output': 'Output',
    'mode.run': 'Run',
    'speed.label': 'Speed',
    'speed.off': 'Off',
    'editor.title': 'Assembly source',
    'editor.lines': '{count} lines',
    'view.label': 'View',
    'view.editor': 'Editor',
    'view.machine': 'Machine',
    'machine.title': 'Machine',
    'machine.description': 'Live von Neumann machine state',
    'status.title': 'Status',
    'status.description': 'Live machine values',
    'status.status': 'Status',
    'status.phase': 'Phase',
    'status.bz': 'BZ',
    'status.ac': 'AC',
    'status.aus': 'AUS',
    'status.line': 'Line',
    'status.decoded': 'Decoded',
    'status.idle': 'Idle',
    'status.ready': 'Ready',
    'status.running': 'Running',
    'status.paused': 'Paused',
    'status.waiting-input': 'Waiting for input',
    'status.waiting-output': 'Output ready',
    'status.finished': 'Finished',
    'status.error': 'Error',
    'diagnostics.title': 'Diagnostics',
    'diagnostics.line': 'Line {line}: {message}',
    'input.title': 'Input required',
    'input.description': 'The input register is waiting for a value.',
    'input.label': 'Input value',
    'input.validRange': 'Valid range: -9999 to 9999.',
    'input.invalid': 'Enter an integer from -9999 to 9999.',
    'input.submit': 'Submit',
    'output.title': 'Program output',
    'output.description': 'The program wrote a value to the output register.',
    'output.label': 'Output value',
    'output.continue': 'Continue',
    'listing.title': 'Machine code listing',
    'listing.description': 'Source lines, addresses, and encoded words',
    'listing.addr': 'Addr',
    'listing.code': 'Code',
    'listing.source': 'Source',
    'listing.trigger': 'Listing',
    'reference.title': 'Command reference',
    'reference.description': 'MOPS instruction set and operand forms.',
    'reference.trigger': 'Reference',
    'reference.mnemonic': 'Mnemonic',
    'reference.operands': 'Operands',
    'reference.opcode': 'Code',
    'reference.descriptionColumn': 'Description',
    'reference.address': 'address',
    'reference.immediate': 'value',
    'reference.target': 'target',
    'reference.none': '—',
    'file.trigger': 'File',
    'file.title': 'Source file',
    'file.description':
        'Download the assembly source and upload the .ass file to your Moodle assignment.',
    'file.download': 'Download source (.ass)',
    'file.downloadHint': 'The source file is the submission artifact.',
    'file.importSection': 'Import',
    'file.importHint': 'Load a previously downloaded .ass file.',
    'file.choose': 'Choose source file',
    'file.imported': 'Source loaded. Assemble it to run the program.',
    'file.importFailed': 'The file could not be read.',
    'theme.appearance': 'Appearance',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',
    'language.label': 'Language',
    'language.en': 'English',
    'language.de': 'Deutsch',
    'instruction.ld': 'Load a value into the accumulator.',
    'instruction.st': 'Store the accumulator in memory.',
    'instruction.in': 'Read a value from the input register into memory.',
    'instruction.out': 'Write a value or memory cell to the output register.',
    'instruction.add': 'Add the operand to the accumulator.',
    'instruction.sub': 'Subtract the operand from the accumulator.',
    'instruction.mul': 'Multiply the accumulator by the operand.',
    'instruction.div': 'Divide the accumulator by the operand.',
    'instruction.mod': 'Store the division remainder in the accumulator.',
    'instruction.cmp': 'Compare the accumulator with the operand.',
    'instruction.jmp': 'Jump to a target.',
    'instruction.jlt': 'Jump when the last comparison was less than.',
    'instruction.jeq': 'Jump when the last comparison was equal.',
    'instruction.jgt': 'Jump when the last comparison was greater than.',
    'instruction.end': 'End the program.',
    'diagram.title': 'MOPS von Neumann machine',
    'diagram.description':
        'Memory, control unit, ALU, and input/output unit with live register and bus states.',
    'diagram.memoryUnit': 'MEMORY UNIT',
    'diagram.memoryLogic': 'MEMORY LOGIC',
    'diagram.controlUnit': 'CONTROL UNIT',
    'diagram.controlLogic': 'CONTROL LOGIC',
    'diagram.instructionCounter': 'INSTRUCTION COUNTER',
    'diagram.instructionRegister': 'INSTRUCTION REGISTER',
    'diagram.decoder': 'DECODER',
    'diagram.alu': 'ALU',
    'diagram.operand': 'OPERAND',
    'diagram.accumulator': 'ACCUMULATOR',
    'diagram.compare': 'COMPARE',
    'diagram.result': 'RESULT',
    'diagram.inputOutput': 'INPUT / OUTPUT',
    'diagram.outputRegister': 'OUTPUT REGISTER',
    'diagram.inputRegister': 'INPUT REGISTER',
} as const;

export type MessageKey = keyof typeof en;

const de: Record<MessageKey, string> = {
    'app.subtitle': 'Von-Neumann-Modellrechner',
    'app.description': 'Ein webbasierter Von-Neumann-Modellrechner.',
    'header.reference': 'Befehlsreferenz',
    'header.language': 'Sprache',
    'header.theme': 'Theme',
    'task.label': 'Task',
    'task.practice': 'Freies Üben',
    'task.unknown': 'Moodle-Aufgabe',
    'toolbar.assemble': 'Assemblieren',
    'toolbar.start': 'Start',
    'toolbar.pause': 'Pause',
    'toolbar.step': 'Schritt',
    'toolbar.back': 'Zurück',
    'toolbar.stop': 'Stop',
    'toolbar.listing': 'Listing',
    'toolbar.file': 'Datei',
    'settings.label': 'Lauf-Einstellungen',
    'mode.label': 'Modus',
    'mode.micro': 'Micro',
    'mode.phases': 'Phasen',
    'mode.commands': 'Befehle',
    'mode.output': 'Output',
    'mode.run': 'Run',
    'speed.label': 'Speed',
    'speed.off': 'Off',
    'editor.title': 'Assembler-Code',
    'editor.lines': '{count} Zeilen',
    'view.label': 'Ansicht',
    'view.editor': 'Editor',
    'view.machine': 'Rechner',
    'machine.title': 'Rechner',
    'machine.description': 'Live-State des Von-Neumann-Rechners',
    'status.title': 'Status',
    'status.description': 'Aktuelle Registerwerte',
    'status.status': 'Status',
    'status.phase': 'Phase',
    'status.bz': 'BZ',
    'status.ac': 'AC',
    'status.aus': 'AUS',
    'status.line': 'Zeile',
    'status.decoded': 'Dekodiert',
    'status.idle': 'Idle',
    'status.ready': 'Ready',
    'status.running': 'Running',
    'status.paused': 'Paused',
    'status.waiting-input': 'Wartet auf Input',
    'status.waiting-output': 'Ausgabe bereit',
    'status.finished': 'Finished',
    'status.error': 'Error',
    'diagnostics.title': 'Diagnostik',
    'diagnostics.line': 'Zeile {line}: {message}',
    'input.title': 'Eingabe erforderlich',
    'input.description': 'Das Input-Register wartet auf einen Wert.',
    'input.label': 'Eingabe-Wert',
    'input.validRange': 'Gültiger Bereich: -9999 bis 9999.',
    'input.invalid': 'Bitte eine ganze Zahl von -9999 bis 9999 eingeben.',
    'input.submit': 'OK',
    'output.title': 'Programmausgabe',
    'output.description':
        'Das Programm hat einen Wert in das Ausgaberegister geschrieben.',
    'output.label': 'Ausgabewert',
    'output.continue': 'Weiter',
    'listing.title': 'Machine-Code-Listing',
    'listing.description': 'Source-Zeilen, Adressen und codierte Wörter',
    'listing.addr': 'Adr',
    'listing.code': 'Code',
    'listing.source': 'Source',
    'listing.trigger': 'Listing',
    'reference.title': 'Befehlsreferenz',
    'reference.description': 'MOPS-Instruction-Set und Operandenformen.',
    'reference.trigger': 'Referenz',
    'reference.mnemonic': 'Mnemonic',
    'reference.operands': 'Operanden',
    'reference.opcode': 'Code',
    'reference.descriptionColumn': 'Beschreibung',
    'reference.address': 'Adresse',
    'reference.immediate': 'Wert',
    'reference.target': 'Ziel',
    'reference.none': '—',
    'file.trigger': 'Datei',
    'file.title': 'Quelltext-Datei',
    'file.description':
        'Lade den Assembler-Code herunter und uploade die .ass-Datei in der Moodle-Aufgabe.',
    'file.download': 'Quelltext herunterladen (.ass)',
    'file.downloadHint': 'Die Quelldatei ist die Abgabe.',
    'file.importSection': 'Import',
    'file.importHint': 'Eine zuvor heruntergeladene .ass-Datei laden.',
    'file.choose': 'Quelltextdatei wählen',
    'file.imported': 'Quelltext geladen. Zum Ausführen assemblieren.',
    'file.importFailed': 'Die Datei konnte nicht gelesen werden.',
    'theme.appearance': 'Theme',
    'theme.light': 'Hell',
    'theme.dark': 'Dunkel',
    'theme.system': 'System',
    'language.label': 'Sprache',
    'language.en': 'English',
    'language.de': 'Deutsch',
    'instruction.ld': 'Lädt einen Wert in den Akkumulator.',
    'instruction.st': 'Speichert den Akkumulator im Memory.',
    'instruction.in': 'Liest einen Wert aus dem Input-Register ins Memory.',
    'instruction.out':
        'Schreibt einen Wert oder eine Memory-Zelle ins Output-Register.',
    'instruction.add': 'Addiert den Operanden zum Akkumulator.',
    'instruction.sub': 'Subtrahiert den Operanden vom Akkumulator.',
    'instruction.mul': 'Multipliziert den Akkumulator mit dem Operanden.',
    'instruction.div': 'Dividiert den Akkumulator durch den Operanden.',
    'instruction.mod': 'Speichert den Divisionsrest im Akkumulator.',
    'instruction.cmp': 'Vergleicht den Akkumulator mit dem Operanden.',
    'instruction.jmp': 'Springt zu einem Target.',
    'instruction.jlt': 'Springt, wenn der letzte Compare kleiner war.',
    'instruction.jeq': 'Springt, wenn der letzte Compare gleich war.',
    'instruction.jgt': 'Springt, wenn der letzte Compare größer war.',
    'instruction.end': 'Beendet das Programm.',
    'diagram.title': 'MOPS-Von-Neumann-Rechner',
    'diagram.description':
        'Memory, Control Unit, ALU und Input/Output mit Live-Register- und Bus-States.',
    'diagram.memoryUnit': 'SPEICHERWERK',
    'diagram.memoryLogic': 'SPEICHERLOGIK',
    'diagram.controlUnit': 'STEUERWERK',
    'diagram.controlLogic': 'STEUERLOGIK',
    'diagram.instructionCounter': 'BEFEHLSZÄHLER',
    'diagram.instructionRegister': 'BEFEHLSREGISTER',
    'diagram.decoder': 'DECODER',
    'diagram.alu': 'RECHENWERK',
    'diagram.operand': 'OPERAND',
    'diagram.accumulator': 'AKKUMULATOR',
    'diagram.compare': 'COMPARE',
    'diagram.result': 'RESULT',
    'diagram.inputOutput': 'INPUT / OUTPUT',
    'diagram.outputRegister': 'OUTPUT-REGISTER',
    'diagram.inputRegister': 'INPUT-REGISTER',
};

export const messages: Record<Language, Record<MessageKey, string>> = {
    en,
    de,
};

export const LANGUAGES: readonly Language[] = ['en', 'de'];

const diagnosticDe: Readonly<Record<string, string>> = {
    indentation: 'Befehle dürfen nicht eingerückt werden.',
    'empty-label': 'Markenname fehlt.',
    'empty-line': 'Die Zeile enthält keinen Befehl.',
    'label-without-instruction':
        'Eine Marke muss an einen Befehl gebunden sein.',
    'invalid-label':
        'Eine Marke muss mit einem Buchstaben beginnen und darf nur Buchstaben und Ziffern enthalten.',
    'unknown-mnemonic': 'Unbekannter Befehl.',
    'missing-operand': 'Operand fehlt.',
    'end-with-operand': 'Der end-Befehl nimmt keinen Operanden.',
    'duplicate-label': 'Marke ist bereits definiert.',
    'invalid-address': 'Der Befehl benötigt eine Datenadresse.',
    'invalid-operand':
        'Der Operand muss eine Adresse oder eine ganze Zahl sein.',
    'invalid-line-target': 'Das Zeilenziel muss zwischen 1 und 99 liegen.',
    'invalid-jump-target':
        'Das Sprungziel muss eine Marke oder eine Zeilennummer sein.',
    'undefined-jump-target': 'Das Sprungziel ist nicht definiert.',
    'conditional-without-compare':
        'Ein bedingter Sprung benötigt einen vorherigen cmp-Befehl.',
    'missing-end': 'Das Programm muss mit end abgeschlossen werden.',
    'program-overflow':
        'Das Programm ist zu groß für den verfügbaren Speicher.',
    'code-after-end': 'Befehle nach end werden nicht ausgeführt.',
    'unused-label': 'Die Marke wird nicht angesprungen.',
    'invalid-operand-mode': 'Der Befehl unterstützt diesen Operanden nicht.',
};

const trapDe: Readonly<Record<string, string>> = {
    DIVISION_BY_ZERO: 'Division durch null.',
    OVERFLOW: 'Das Ergebnis liegt außerhalb des zulässigen Bereichs.',
    COMPARE_NOT_SET: 'Das Vergleichsregister ist nicht gesetzt.',
    INVALID_OPCODE: 'Ungültiger Opcode.',
    PC_OUT_OF_RANGE: 'Der Befehlszähler liegt außerhalb des Speichers.',
    MEMORY_OUT_OF_RANGE: 'Der Speicherzugriff liegt außerhalb des Speichers.',
    INPUT_OUT_OF_RANGE:
        'Der Eingabewert liegt außerhalb des zulässigen Bereichs.',
};

/**
 * Replaces `{name}` placeholders in a message.
 *
 * @param template Message template.
 * @param params Placeholder values.
 * @returns The interpolated message.
 */
export function interpolate(
    template: string,
    params: Readonly<Record<string, string | number>> = {},
): string {
    return template.replace(/\{(\w+)\}/g, (match, key: string) =>
        Object.hasOwn(params, key) ? String(params[key]) : match,
    );
}

/**
 * Translates an assembler diagnostic by stable code.
 *
 * @param language Active language.
 * @param code Diagnostic code.
 * @param fallback Original diagnostic message.
 * @returns The localized message.
 */
export function translateDiagnostic(
    language: Language,
    code: string,
    fallback: string,
): string {
    return language === 'de' ? (diagnosticDe[code] ?? fallback) : fallback;
}

/**
 * Translates a runtime trap by stable code.
 *
 * @param language Active language.
 * @param code Trap code.
 * @param fallback Original trap message.
 * @returns The localized message.
 */
export function translateTrap(
    language: Language,
    code: string,
    fallback: string,
): string {
    return language === 'de' ? (trapDe[code] ?? fallback) : fallback;
}
