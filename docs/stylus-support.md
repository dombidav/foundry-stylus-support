# Stylus support

## Use the module

1. In a D&D 5e world, enable **Swipe VTT** and **Stylus Support**, then open a scene. The integration uses the settings and controller contract from Swipe VTT 2.12.4. [Swipe VTT release](https://github.com/crlngn/swipe-vtt/releases/tag/v2.12.4)
2. Click the floating hand on the left. The module forces Swipe desktop touch mode and sets one-finger drag to selection. Swipe owns two-finger pan and pinch. The top toolbar appears after Swipe initializes touch for the current canvas. Clicking the hand again releases the override and restores the prior client values that still match it.
3. Open **Configure Settings → Module Settings → Stylus Support → Configure stylus buttons**. Set the number of buttons from zero through 15. The rows update as soon as the count changes. Zero leaves the toolbar and its undo button available.
4. Choose an action for each button. **Run macro** adds a menu of executable world macros. **Select tool** adds a menu of available tools. **Previous tool** and **Next tool** wrap through the visible tools. **Undo last drawing** removes your most recent tracked drawing in the active scene.
5. Choose **Learn** on a row. Tap with the plain tip, press and release the button while hovering, then choose **Continue to tap test**. Hold the button before touching the test area and repeat the same gesture twice. Use **Test** to check recognition before saving. Save changes to apply the bindings in this browser.

The toolbar offers Select tokens, Measure distance, Freehand draw, Draw rectangle, Draw ellipse, Draw polygon, Erase drawing, and Lasso tokens according to Foundry's scene controls and permissions. The eraser removes the topmost visible, unlocked drawing you may delete under a short tap. The lasso selects visible, controllable tokens whose centers lie inside the freehand outline. Hold Shift to add to the existing selection. Both tools accept a physical mouse or a pen. Undo tracks successful drawings created by the current user while stylus mode is active. It is scoped to the active scene and browser session. [Foundry drawing tools](https://foundryvtt.com/article/drawings/), [Foundry SceneControls](https://foundryvtt.com/api/v14/classes/foundry.applications.ui.SceneControls.html#activate)

| Button action | Behavior |
| --- | --- |
| **Active tool action** | Finish an open polygon with at least three fixed vertices or add a waypoint at the button tap during a measurement. A learned binding for this action keeps a pen measurement open when the tip lifts so it can accept waypoints. A measurement kept open by Stylus Support clears when you switch tools, disable the mode, or remove the last binding for this action. |
| **Remove last point** | Remove the last placed polygon vertex or ruler waypoint. If a measurement has only its origin and live destination, clear it. |
| **Cancel current gesture** | Discard the active drawing preview, measurement, or lasso. |
| **Invert grid snapping for the next stroke** | Arm the override and show its status on the toolbar. The next pen drag for a rectangle, ellipse, polygon, or measurement uses the opposite of the native Shift snap modifier. A second press disarms the override. |

## Compatibility

Each learned signal consists of a pen event type and a `buttons` mask. On the tested pen, holding the eraser or barrel button before touching produces `pointerdown` with mask `32` or `2`. The feature also accepts a `pointermove` that adds tip contact when the held barrel button had already caused a hover `pointerdown`. Calibration rejects an identical hover signal and duplicate bindings. Devices that expose the same signal for hover and contact may need to use the toolbar. Some eraser-mode changes close an active pen interaction and report another `pointerdown`, which the browser treats as a new contact. [W3C Pointer Events](https://www.w3.org/TR/pointerevents3/)

The feature claims configured pen gestures and the primary input for the eraser and lasso on the game board. Swipe retains finger handling. Foundry checks macro permissions again at execution time. Swipe settings with GM restrictions can block a local override. The module requires Swipe to report an active touch manager before displaying the toolbar. [Foundry Macro](https://foundryvtt.com/api/v14/classes/foundry.documents.Macro.html#canExecute)

## Foundry test checklist

In a running world, test one-finger token selection, two-finger pan and pinch, all eight tools, and both button signals alongside ordinary mouse input. Check that a short mapped tap runs its action once. Test overlapping drawings, a concave lasso, polygon completion, ruler waypoints, and that the snap override expires after a single pen drag. Test switching scenes, reloading before releasing the override, using another browser, and enabling with GM-locked Swipe settings.
