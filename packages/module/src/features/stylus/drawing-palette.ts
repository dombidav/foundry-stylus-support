export function isDrawingCreationTool(
    control: string | undefined,
    tool: object | undefined,
): boolean {
    return (
        control === 'drawings' &&
        !!tool &&
        'creation' in tool &&
        tool.creation === true
    );
}

export function createDrawingPaletteControls(
    controls: typeof ui.controls,
    onError: (error: unknown) => void,
) {
    let lastControl: string | undefined;
    let lastTool: string | undefined;
    let shouldOpen = false;
    let pending: Promise<void> | undefined;

    function request(isOpen: boolean): Promise<void> | undefined {
        shouldOpen = isOpen;
        if (pending) return pending;
        // Public in v14. The installed declarations do not list these two members.
        if (
            !('paletteOpen' in controls) ||
            controls.paletteOpen === isOpen ||
            !('togglePlaceablePalette' in controls) ||
            typeof controls.togglePlaceablePalette !== 'function'
        )
            return;
        const toggle = controls.togglePlaceablePalette;
        let wasRequestedOpen = isOpen;
        pending = Promise.resolve()
            .then(async () => {
                do {
                    wasRequestedOpen = shouldOpen;
                    if (
                        'paletteOpen' in controls &&
                        controls.paletteOpen !== wasRequestedOpen
                    )
                        await toggle.call(controls, wasRequestedOpen);
                } while (wasRequestedOpen !== shouldOpen);
            })
            .catch(onError)
            .finally(() => {
                pending = undefined;
                if (wasRequestedOpen !== shouldOpen) void request(shouldOpen);
            });
        return pending;
    }

    return {
        sync(shouldRefresh = false): Promise<void> | undefined {
            const control = controls.control?.name;
            const tool = controls.tool;
            if (
                !shouldRefresh &&
                control === lastControl &&
                tool?.name === lastTool
            )
                return;
            lastControl = control;
            lastTool = tool?.name;
            return request(isDrawingCreationTool(control, tool));
        },
        closeBeforeLeaving(): Promise<void> | undefined {
            if (lastControl === 'drawings') return request(false);
        },
        stop(): void {
            if (lastControl === 'drawings') void request(false);
            lastControl = undefined;
            lastTool = undefined;
        },
    };
}
