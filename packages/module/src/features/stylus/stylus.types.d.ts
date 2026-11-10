export type ToolId =
    'select' | 'measure' | 'freehand' | 'rectangle' | 'ellipse' | 'polygon';

export type ButtonAction =
    'none' | 'previous' | 'next' | 'undo' | 'macro' | 'tool';

export interface PenSignal {
    type: 'pointerdown' | 'pointermove';
    buttons: number;
}

export interface StylusBinding {
    action: ButtonAction;
    target: string;
    signal: PenSignal | null;
}

export interface StylusTool {
    id: ToolId;
    label: string;
    icon: string;
    control: 'tokens' | 'drawings';
    tool: string;
}

export interface SwipeOverride {
    wasDesktopEnabled: boolean;
    oneFingerDrag: 'pan' | 'select';
}

/** The exposed Swipe VTT 2.12.4 members used to check the effective touch mode. */
export interface SwipeClient {
    // boolean-name-exempt: Swipe VTT exposes its controller state under this property name.
    enabled: boolean;
    touchManager: object | null;
    SettingsManager: {
        getEffective(key: 'oneFingerDrag'): unknown;
        locks: { getState(key: 'oneFingerDrag'): unknown };
    };
}

declare global {
    var SwipeVTT: SwipeClient | undefined;
}
