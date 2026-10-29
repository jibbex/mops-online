/**
 * User-facing translations.
 *
 * English is the source language. German overrides the same keys, while
 * diagnostic and trap translations are resolved by stable codes so core
 * messages remain language-neutral.
 *
 * @module i18n/messages
 */

import { MAX_LINE_TARGET } from '@/core/assembler/limits';
import type { DiagnosticCode } from '@/core/assembler/diagnostics';
import { MAX_WORD, MIN_WORD } from '@/core/object';

export type Language = 'en' | 'de';

const en = {
    'app.subtitle': 'Von Neumann model computer',
    'app.description': 'A web-based von Neumann model computer.',
    'header.reference': 'Command reference',
    'footer.repository': 'GitHub repository',
    'header.language': 'Language settings',
    'header.theme': 'Theme settings',
    'tour.help': 'Guided tour',
    'tour.dialog': 'Guided tour of the machine diagram',
    'tour.step': 'Step {current} of {total}',
    'tour.next': 'Next',
    'tour.back': 'Back',
    'tour.skip': 'Skip tour',
    'tour.finish': 'Done',
    'tour.welcome.title': 'The machine',
    'tour.welcome.body':
        'This diagram shows the model computer. While a program runs, the parts that work in the current micro-step light up. This short tour explains how to read the highlights.',
    'tour.unit.title': 'Active unit',
    'tour.unit.body':
        'The unit that works in the current step gets a colored frame. Here the control unit is active.',
    'tour.read.title': 'Read',
    'tour.read.body':
        'A dashed outline with a soft fill means read. The value is copied out and stays unchanged. Here the program counter is read.',
    'tour.write.title': 'Write',
    'tour.write.body':
        'A solid filled box means write. The register or cell receives a new value. Here the instruction register is written.',
    'tour.increment.title': 'Increment',
    'tour.increment.body':
        'A filled box with a cyan border means increment. The program counter moves on by one instruction. It counts instructions, not memory cells.',
    'tour.bus.title': 'Data packet',
    'tour.bus.body':
        'A cyan packet travels along the bus for every real transfer between two units. Internal steps inside one unit show no packet.',
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
    'editor.ariaLabel': 'Assembly source editor',
    'view.label': 'View',
    'view.editor': 'Editor',
    'view.machine': 'Machine',
    'machine.title': 'Machine',
    'machine.description': 'Live von Neumann machine state',
    'status.title': 'Status',
    'status.description': 'Live machine values',
    'status.status': 'Status',
    'status.phase': 'Phase',
    'status.pc': 'BZ',
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
    'input.validRange': `Valid range: ${MIN_WORD} to ${MAX_WORD}.`,
    'input.invalid': `Enter an integer from ${MIN_WORD} to ${MAX_WORD}.`,
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
        'Download the assembly source and upload the .asm file to your Moodle assignment.',
    'file.download': 'Download source (.asm)',
    'file.downloadHint': 'The source file is the submission artifact.',
    'file.importSection': 'Import',
    'file.importHint':
        'Load a previously downloaded .asm file (max. {max} KiB).',
    'file.choose': 'Choose source file',
    'file.reading': 'Reading file…',
    'file.exportSuccessTitle': 'Download started',
    'file.exportSuccess':
        'The source file was handed to the browser. Close the dialog when you are done.',
    'file.exportErrorTitle': 'Export failed',
    'file.exportError': 'The source file could not be downloaded.',
    'file.importErrorTitle': 'Import failed',
    'file.importEmpty': 'The file is empty.',
    'file.importTooLarge':
        'The file is too large. The maximum size is {max} KiB.',
    'file.importUnreadable': 'The file could not be read.',
    'file.importBinary': 'The file is not a plain text file.',
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
    'footer.repository': 'GitHub-Repository',
    'header.language': 'Sprache',
    'header.theme': 'Theme',
    'tour.help': 'Geführte Tour',
    'tour.dialog': 'Geführte Tour durch das Maschinendiagramm',
    'tour.step': 'Schritt {current} von {total}',
    'tour.next': 'Weiter',
    'tour.back': 'Zurück',
    'tour.skip': 'Tour überspringen',
    'tour.finish': 'Fertig',
    'tour.welcome.title': 'Der Rechner',
    'tour.welcome.body':
        'Dieses Diagramm zeigt den Modellrechner. Während ein Programm läuft, leuchten die Teile auf, die im aktuellen Mikroschritt arbeiten. Diese kurze Tour erklärt die Kennzeichnungen.',
    'tour.unit.title': 'Aktive Einheit',
    'tour.unit.body':
        'Die Einheit, die im aktuellen Schritt arbeitet, erhält einen farbigen Rahmen. Hier ist das Steuerwerk aktiv.',
    'tour.read.title': 'Lesen',
    'tour.read.body':
        'Ein gestrichelter Rand mit heller Füllung bedeutet Lesen. Der Wert wird ausgegeben und bleibt unverändert. Hier wird der Befehlszähler gelesen.',
    'tour.write.title': 'Schreiben',
    'tour.write.body':
        'Ein durchgehend gefülltes Feld bedeutet Schreiben. Das Register oder die Zelle erhält einen neuen Wert. Hier wird das Befehlsregister geschrieben.',
    'tour.increment.title': 'Erhöhen',
    'tour.increment.body':
        'Ein gefülltes Feld mit cyanfarbenem Rand bedeutet Erhöhen. Der Befehlszähler geht um einen Befehl weiter. Er zählt Befehle und keine Speicherzellen.',
    'tour.bus.title': 'Datenpaket',
    'tour.bus.body':
        'Für jede echte Übertragung zwischen zwei Einheiten läuft ein cyanfarbenes Paket über den Bus. Interne Schritte innerhalb einer Einheit zeigen kein Paket.',
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
    'editor.ariaLabel': 'Assembler-Code-Editor',
    'view.label': 'Ansicht',
    'view.editor': 'Editor',
    'view.machine': 'Rechner',
    'machine.title': 'Rechner',
    'machine.description': 'Live-State des Von-Neumann-Rechners',
    'status.title': 'Status',
    'status.description': 'Aktuelle Registerwerte',
    'status.status': 'Status',
    'status.phase': 'Phase',
    'status.pc': 'BZ',
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
    'input.validRange': `Gültiger Bereich: ${MIN_WORD} bis ${MAX_WORD}.`,
    'input.invalid': `Bitte eine ganze Zahl von ${MIN_WORD} bis ${MAX_WORD} eingeben.`,
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
        'Lade den Assembler-Code herunter und uploade die .asm-Datei in der Moodle-Aufgabe.',
    'file.download': 'Quelltext herunterladen (.asm)',
    'file.downloadHint': 'Die Quelldatei ist die Abgabe.',
    'file.importSection': 'Import',
    'file.importHint':
        'Eine zuvor heruntergeladene .asm-Datei laden (max. {max} KiB).',
    'file.choose': 'Quelltextdatei wählen',
    'file.reading': 'Datei wird gelesen…',
    'file.exportSuccessTitle': 'Download gestartet',
    'file.exportSuccess':
        'Die Quelldatei wurde an den Browser übergeben. Schließe den Dialog, wenn du fertig bist.',
    'file.exportErrorTitle': 'Export fehlgeschlagen',
    'file.exportError': 'Die Quelldatei konnte nicht heruntergeladen werden.',
    'file.importErrorTitle': 'Import fehlgeschlagen',
    'file.importEmpty': 'Die Datei ist leer.',
    'file.importTooLarge':
        'Die Datei ist zu groß. Maximal {max} KiB sind erlaubt.',
    'file.importUnreadable': 'Die Datei konnte nicht gelesen werden.',
    'file.importBinary': 'Die Datei ist keine reine Textdatei.',
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

const diagnosticDe: Readonly<Record<DiagnosticCode, string>> = {
    indentation: 'Befehle dürfen nicht eingerückt werden.',
    'empty-label': 'Markenname fehlt.',
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
    'invalid-line-target': `Das Zeilenziel muss zwischen 1 und ${MAX_LINE_TARGET} liegen.`,
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
    return language === 'de'
        ? (diagnosticDe[code as DiagnosticCode] ?? fallback)
        : fallback;
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
