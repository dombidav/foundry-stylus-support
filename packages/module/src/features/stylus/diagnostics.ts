import {
    type DiagnosticData,
    type DiagnosticEntry,
    type DiagnosticOutput,
    type DiagnosticPointer,
} from './diagnostics.types.js';

const MAX_ENTRIES = 16384;

export function createStylusDiagnostics(
    output: DiagnosticOutput,
    capacity = MAX_ENTRIES,
) {
    const startedAtMs = performance.now();
    const entries: DiagnosticEntry[] = [];
    let sequence = 0;
    let next = 0;

    function record(
        source: DiagnosticEntry['source'],
        event: string,
        data?: DiagnosticData,
    ): void {
        if (!output.isVerbose) return;
        output.debug(`${source}.${event}`, append(source, event, data));
    }

    function append(
        source: DiagnosticEntry['source'],
        event: string,
        data?: DiagnosticData,
    ): DiagnosticEntry {
        const entry = {
            sequence: ++sequence,
            timeMs: performance.now(),
            source,
            event,
            data,
        };
        // Bound verbose memory without shifting entries or keeping live DOM/Pixi objects.
        entries[next] = entry;
        next = (next + 1) % capacity;
        return entry;
    }

    function exportJson(context: DiagnosticData): string {
        const isVerbose = output.isVerbose;
        const entry = append('stylus', 'export', { isVerbose });
        const json = JSON.stringify(
            {
                schemaVersion: 1,
                timeOrigin: performance.timeOrigin,
                startedAtMs,
                exportedAtMs: entry.timeMs,
                droppedEntries: sequence - entries.length,
                context,
                entries:
                    entries.length === capacity
                        ? entries.slice(next).concat(entries.slice(0, next))
                        : entries,
            },
            null,
            2,
        );
        if (isVerbose) output.debug('stylus.export', entry);
        return json;
    }

    return { record, exportJson };
}

export function pointerDetails(event: DiagnosticPointer) {
    return {
        eventTimeMs: event.timeStamp,
        pointerType: event.pointerType,
        pointerId: event.pointerId,
        button: event.button,
        buttons: event.buttons,
        pressure: event.pressure,
        clientX: event.clientX,
        clientY: event.clientY,
        isPrimary: event.isPrimary,
        isTrusted: event.isTrusted,
        isDefaultPrevented: event.defaultPrevented,
        hasShift: event.shiftKey,
        hasCtrl: event.ctrlKey,
        hasMeta: event.metaKey,
    };
}
