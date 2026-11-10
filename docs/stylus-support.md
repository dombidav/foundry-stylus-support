# Stylus support

## Use the module

1. In a D&D 5e world, enable **Swipe VTT** and **Stylus Support**, then open a scene. The integration uses the settings and controller contract from Swipe VTT 2.12.4. [Swipe VTT release](https://github.com/crlngn/swipe-vtt/releases/tag/v2.12.4)
2. Click the floating hand on the left. The module forces Swipe desktop touch mode and sets one-finger drag to selection. Swipe owns two-finger pan and pinch. The top toolbar appears after Swipe initializes touch for the current canvas. Clicking the hand again releases the override and restores the prior client values that still match it.
3. Open **Configure Settings → Module Settings → Stylus Support → Configure stylus buttons**. Set the number of buttons from zero through 15. The rows update as soon as the count changes. Zero leaves the toolbar and its undo button available.
4. Choose an action for each button. **Run macro** adds a menu of executable world macros. **Select tool** adds a menu of the available native tools. **Previous tool** and **Next tool** wrap through the visible tools. **Undo last drawing** removes your most recent tracked drawing in the active scene.
5. Choose **Learn** on a row. Tap with the plain tip, press and release the button while hovering, then choose **Continue to tap test**. Hold the button before touching the test area and repeat the same gesture twice. Use **Test** to check recognition before saving. Save changes to apply the bindings in this browser.

The toolbar offers Select tokens, Measure distance, Freehand draw, Draw rectangle, Draw ellipse, and Draw polygon according to Foundry's scene controls and permissions. These use Foundry's native interactions, including its polygon completion and scene measurement behavior. Undo tracks successful drawings created by the current user while stylus mode is active. It is scoped to the active scene and browser session. [Foundry drawing tools](https://foundryvtt.com/article/drawings/), [Foundry SceneControls](https://foundryvtt.com/api/v14/classes/foundry.applications.ui.SceneControls.html#activate)

## Compatibility

Each learned signal consists of a pen event type and a `buttons` mask. On the tested pen, holding the eraser or barrel button before touching produces `pointerdown` with mask `32` or `2`. The feature also accepts a `pointermove` that adds tip contact when the held barrel button had already caused a hover `pointerdown`. Calibration rejects an identical hover signal and duplicate bindings. Devices that expose the same signal for hover and contact may need to use the toolbar. Some eraser-mode changes close an active pen interaction and report another `pointerdown`, which the browser treats as a new contact. [W3C Pointer Events](https://www.w3.org/TR/pointerevents3/)

The feature claims only configured pen gestures on the game board. This keeps ordinary pen input, mouse input, and Swipe finger handling on their existing paths. Foundry checks macro permissions again at execution time. Swipe settings with GM restrictions can block a local override. The module also requires Swipe to report an active touch manager before displaying the toolbar. [Foundry Macro](https://foundryvtt.com/api/v14/classes/foundry.documents.Macro.html#canExecute)

## Browser proof of concept

Open [`poc/stylus/index.html`](../poc/stylus/index.html) directly in the browser you use for Foundry. The page runs locally from disk with no installation or server. Use a finger, hover the pen, draw with different pressures and angles, then press and release each physical button separately both in hover and with the tip down. The panel shows the latest pointer sample and keeps the last 20 input events. It records pointer button changes, `mousedown`, `mouseup`, `contextmenu`, `auxclick`, and keyboard events received while the canvas has focus.

Click or tab to the canvas before testing a button mapped to a keystroke. Select an observed signal in the test binding and repeat the gesture on the canvas. A match changes the background and increments the counter. The binding uses one signal at a time, since a physical gesture can produce several DOM events. The drawing tip and ordinary primary mouse clicks remain visible in the log. [Pointer Events](https://www.w3.org/TR/pointerevents3/#the-click-auxclick-and-contextmenu-events), [UI Events](https://www.w3.org/TR/uievents/#events-keyboardevents)

`maxTouchPoints` reports the browser's touch capability. A `touch` contact and a `pen` sample confirm what the browser actually delivers to the page. Varying pen pressure and nonzero tilt provide stronger evidence than the fallback values `0.5` and `0°`. Button mappings must be measured on the target device. [W3C Pointer Events](https://www.w3.org/TR/pointerevents3/)

## Foundry test checklist

In a running world, test one-finger token selection, two-finger pan and pinch, all six tools, and both button signals alongside ordinary mouse input. Check that a short mapped tap runs its action once and leaves the underlying tool idle. Test switching scenes, reloading before releasing the override, using another browser, and enabling with GM-locked Swipe settings.
