import { expect, it, vi } from 'vitest';
import { createDrawingPaletteControls } from '../../../src/features/stylus/drawing-palette.ts';

function fixture() {
    const controls = {
        control: { name: 'drawings' },
        tool: { name: 'freehand', creation: true },
        paletteOpen: false,
        togglePlaceablePalette: vi.fn(async (isOpen: boolean) => {
            controls.paletteOpen = isOpen;
        }),
    };
    const onError = vi.fn();
    // Only the SceneControls members used by the palette are needed here.
    const palette = createDrawingPaletteControls(
        controls as unknown as typeof ui.controls,
        onError,
    );
    return { controls, palette, onError };
}

it('opens the native palette for creation tools, keeps it across drawing tools, and closes for erasing or measuring', async () => {
    const { controls, palette } = fixture();
    await palette.sync();
    controls.tool = { name: 'polygon', creation: true };
    await palette.sync();
    expect(controls.togglePlaceablePalette.mock.calls).toEqual([[true]]);

    controls.tool = { name: 'select', creation: false };
    await palette.sync();
    expect(controls.paletteOpen).toBe(false);
    controls.tool = { name: 'rect', creation: true };
    await palette.sync();
    await palette.closeBeforeLeaving();
    controls.control = { name: 'tokens' };
    controls.tool = { name: 'ruler', creation: false };
    await palette.sync();
    expect(controls.togglePlaceablePalette.mock.calls).toEqual([
        [true],
        [false],
        [true],
        [false],
    ]);
});

it('respects a manual close until the user explicitly selects a drawing tool again', async () => {
    const { controls, palette } = fixture();
    await palette.sync();
    controls.paletteOpen = false;
    await palette.sync();
    expect(controls.togglePlaceablePalette).toHaveBeenCalledOnce();

    await palette.sync(true);
    expect(controls.togglePlaceablePalette).toHaveBeenCalledTimes(2);
    expect(controls.paletteOpen).toBe(true);
});

it('finishes with the most recently requested visibility when the native palette is still opening', async () => {
    const { controls, palette, onError } = fixture();
    let finishOpening = () => {};
    const opening = new Promise<void>((resolve) => {
        finishOpening = resolve;
    });
    controls.togglePlaceablePalette.mockImplementationOnce(async (isOpen) => {
        await opening;
        controls.paletteOpen = isOpen;
    });
    const pending = palette.sync();
    await Promise.resolve();
    expect(controls.togglePlaceablePalette).toHaveBeenCalledExactlyOnceWith(
        true,
    );

    controls.control = { name: 'tokens' };
    controls.tool = { name: 'ruler', creation: false };
    const closing = palette.sync();
    finishOpening();
    await closing;
    await pending;
    expect(controls.togglePlaceablePalette.mock.calls).toEqual([
        [true],
        [false],
    ]);
    expect(controls.paletteOpen).toBe(false);
    expect(onError).not.toHaveBeenCalled();
});
