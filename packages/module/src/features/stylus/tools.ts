import { type StylusTool } from './stylus.types.js';

// Foundry v14 TokenLayer and DrawingsLayer prepareSceneControls keys.
export const STYLUS_TOOLS: readonly StylusTool[] = [
    {
        id: 'select',
        label: 'Select tokens',
        icon: 'fa-expand',
        control: 'tokens',
        tool: 'select',
    },
    {
        id: 'measure',
        label: 'Measure distance',
        icon: 'fa-ruler',
        control: 'tokens',
        tool: 'ruler',
    },
    {
        id: 'freehand',
        label: 'Freehand draw',
        icon: 'fa-signature',
        control: 'drawings',
        tool: 'freehand',
    },
    {
        id: 'rectangle',
        label: 'Draw rectangle',
        icon: 'fa-vector-square',
        control: 'drawings',
        tool: 'rect',
    },
    {
        id: 'ellipse',
        label: 'Draw ellipse',
        icon: 'fa-circle',
        control: 'drawings',
        tool: 'ellipse',
    },
    {
        id: 'polygon',
        label: 'Draw polygon',
        icon: 'fa-draw-polygon',
        control: 'drawings',
        tool: 'polygon',
    },
];

export function getAvailableTools(): StylusTool[] {
    const controls = ui.controls?.controls;
    return STYLUS_TOOLS.filter(({ control, tool }) => {
        const group = controls?.[control];
        const nativeTool = group?.tools?.[tool];
        return (
            group?.visible !== false &&
            !!nativeTool &&
            nativeTool.visible !== false
        );
    });
}
