import { expect, it, vi } from 'vitest';
import { createStylusDiagnostics } from '../../../src/features/stylus/diagnostics.ts';

it('exports the newest enabled entries in capture order, even after verbose mode is turned off', () => {
    const output = { isVerbose: false, debug: vi.fn() };
    const trace = createStylusDiagnostics(output, 2);
    trace.record('pointer', 'ignored');
    output.isVerbose = true;
    trace.record('pointer', 'pointerdown', { pointerId: 5 });
    trace.record('foundry', 'dragLeftDrop:before', { pointerId: 5 });
    trace.record('pointer', 'pointerup', { pointerId: 5 });
    output.isVerbose = false;
    trace.record('pointer', 'ignored');

    expect(output.debug).toHaveBeenCalledTimes(3);
    expect(
        JSON.parse(trace.exportJson({ moduleVersion: '1.0.1' })),
    ).toMatchObject({
        schemaVersion: 1,
        timeOrigin: expect.any(Number),
        exportedAtMs: expect.any(Number),
        droppedEntries: 2,
        context: { moduleVersion: '1.0.1' },
        entries: [
            {
                sequence: 3,
                timeMs: expect.any(Number),
                source: 'pointer',
                event: 'pointerup',
                data: { pointerId: 5 },
            },
            {
                sequence: 4,
                timeMs: expect.any(Number),
                source: 'stylus',
                event: 'export',
                data: { isVerbose: false },
            },
        ],
    });
    expect(output.debug).toHaveBeenCalledTimes(3);
    const reload = createStylusDiagnostics(output, 2);
    expect(JSON.parse(reload.exportJson({}))).toMatchObject({
        droppedEntries: 0,
        entries: [{ sequence: 1, source: 'stylus', event: 'export' }],
    });
    expect(JSON.parse(reload.exportJson({}))).toMatchObject({
        entries: [
            { sequence: 1, source: 'stylus', event: 'export' },
            { sequence: 2, source: 'stylus', event: 'export' },
        ],
    });
});
