export type DiagnosticData = Record<
    string,
    string | number | boolean | null | undefined
>;

export interface DiagnosticEntry {
    sequence: number;
    timeMs: number;
    source: 'pointer' | 'calibration' | 'foundry' | 'stylus';
    event: string;
    data?: DiagnosticData;
}

export interface DiagnosticOutput {
    readonly isVerbose: boolean;
    debug(message: string, entry: DiagnosticEntry): void;
}

export type DiagnosticPointer = Pick<
    PointerEvent,
    | 'timeStamp'
    | 'pointerType'
    | 'pointerId'
    | 'button'
    | 'buttons'
    | 'pressure'
    | 'clientX'
    | 'clientY'
    | 'isPrimary'
    | 'isTrusted'
    | 'defaultPrevented'
    | 'shiftKey'
    | 'ctrlKey'
    | 'metaKey'
>;
