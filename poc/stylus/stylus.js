/* global document, window, navigator, ResizeObserver, requestAnimationFrame */

const canvas = document.querySelector('#pad');
const ink = canvas.getContext('2d');
const marker = document.querySelector('#marker');
const capabilities = document.querySelector('#capabilities');
const live = document.querySelector('#live');
const buttons = document.querySelector('#buttons');
const binding = document.querySelector('#binding');
const action = document.querySelector('#action');
const strokes = new Map();
const buttonMasks = new Map();
const buttonLog = [];
const signals = new Set();
const colors = { pen: '#70f1d2', touch: '#fdbb72', mouse: '#b9b8ff' };
let hasTouch = false;
let hasPen = false;
let hasHover = false;
let minPressure = Infinity;
let maxPressure = -Infinity;
let maxTilt = 0;
let latest;
let frame;
let eventNumber = 0;
let actionCount = 0;

function format(value, digits) {
    return typeof value === 'number' ? value.toFixed(digits) : '—';
}

function render() {
    frame = undefined;
    const touchPoints = navigator.maxTouchPoints;
    capabilities.textContent = [
        `Pointer Events: ${'PointerEvent' in window ? 'elérhető' : 'nem elérhető'}`,
        `maxTouchPoints: ${touchPoints ?? 'ismeretlen'}`,
        `Érintés / toll: ${hasTouch ? 'észlelve' : '—'} / ${hasPen ? 'észlelve' : '—'}`,
        `Toll lebegése: ${hasHover ? 'észlelve' : 'még nem észlelt'}`,
        `Hegynyomás: ${minPressure === Infinity ? '—' : `${format(minPressure, 3)} … ${format(maxPressure, 3)}`}`,
        `Legnagyobb |tiltX| vagy |tiltY|: ${hasPen ? `${maxTilt}°` : '—'}`,
    ].join('\n');

    marker.hidden = !latest?.isVisible;
    if (marker.hidden === false) {
        marker.style.transform = `translate(${latest.x - 7}px, ${latest.y - 7}px)`;
        marker.style.borderColor =
            colors[latest.event.pointerType] ?? colors.mouse;
    }
    if (latest) {
        const { event, x, y, phase } = latest;
        live.textContent = [
            `${event.pointerType || 'ismeretlen'} #${event.pointerId} · ${phase}`,
            `${event.type} · vászon (CSS px)`,
            `x: ${format(x, 1)}  y: ${format(y, 1)}`,
            `pressure: ${format(event.pressure, 3)}`,
            `tiltX / tiltY: ${event.tiltX ?? '—'}° / ${event.tiltY ?? '—'}°`,
            `button: ${event.button}  buttons: ${event.buttons} (0x${event.buttons.toString(16)})`,
        ].join('\n');
    } else {
        live.textContent = 'Várakozás a vászon eseményeire…';
    }
    buttons.textContent = buttonLog.join('\n') || 'Várakozás gombeseményre…';
}

function queueRender() {
    if (frame === undefined) frame = requestAnimationFrame(render);
}

function logInput(event, details, signal, shouldTrigger = true) {
    eventNumber += 1;
    buttonLog.unshift(`${eventNumber}. ${event.type}\n  ${details}`);
    if (buttonLog.length > 20) buttonLog.pop();
    if (signal) {
        if (!signals.has(signal)) {
            signals.add(signal);
            const option = document.createElement('option');
            option.value = signal;
            option.textContent = signal;
            binding.append(option);
        }
        if (shouldTrigger && binding.value === signal) {
            actionCount += 1;
            canvas.parentElement.classList.toggle('is-triggered');
            action.textContent = `Tesztművelet · ${actionCount} · ${signal}`;
        }
    }
    queueRender();
}

function onMouseAction(event) {
    const source = event.pointerType || 'egérjel / ismeretlen';
    const signal =
        event.button !== 0 || event.type === 'contextmenu'
            ? `${event.type} · ${source} · button=${event.button}`
            : undefined;
    logInput(
        event,
        `${source} button=${event.button} buttons=${event.buttons}`,
        signal,
    );
    if (event.type === 'contextmenu' || event.type === 'auxclick')
        event.preventDefault();
}

function onKey(event) {
    const modifiers = [
        event.ctrlKey && 'Ctrl',
        event.altKey && 'Alt',
        event.shiftKey && 'Shift',
        event.metaKey && 'Meta',
    ].filter(Boolean);
    const keys = [...modifiers, event.code || event.key].join('+');
    const signal = `${event.type} · ${keys}`;
    logInput(
        event,
        `key=${JSON.stringify(event.key)} code=${event.code || '—'} · ${keys}${event.repeat ? ' · ismétlés' : ''}`,
        signal,
        !event.repeat,
    );
    if (
        event.type === 'keydown' &&
        binding.value === signal &&
        event.key !== 'Tab'
    ) {
        event.preventDefault();
    }
}

function resizeCanvas() {
    const { width, height } = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(height * ratio));
    if (canvas.width === pixelWidth && canvas.height === pixelHeight) return;
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    ink.setTransform(ratio, 0, 0, ratio, 0, 0);
    ink.lineCap = 'round';
    strokes.clear();
}

function draw(event, x, y) {
    const previous = strokes.get(event.pointerId);
    const width = event.pointerType === 'pen' ? 1 + 7 * event.pressure : 3;
    const color = colors[event.pointerType] ?? colors.mouse;
    ink.beginPath();
    if (previous) {
        ink.strokeStyle = color;
        ink.lineWidth = width;
        ink.moveTo(previous.x, previous.y);
        ink.lineTo(x, y);
        ink.stroke();
    } else {
        ink.fillStyle = color;
        ink.arc(x, y, width / 2, 0, Math.PI * 2);
        ink.fill();
    }
    strokes.set(event.pointerId, { x, y });
}

function onPointer(event) {
    const { type, pointerType, pointerId, button, buttons: mask } = event;
    const isPen = pointerType === 'pen';
    const isEnd =
        type === 'pointercancel' ||
        type === 'pointerleave' ||
        type === 'lostpointercapture';
    const hasTipContact = !isEnd && (mask & 1) !== 0;
    const { left, top, width, height } = canvas.getBoundingClientRect();
    const x = event.clientX - left;
    const y = event.clientY - top;
    const isInside = x >= 0 && x < width && y >= 0 && y < height;
    const isHover =
        isPen &&
        type === 'pointermove' &&
        mask === 0 &&
        event.pressure === 0 &&
        isInside;

    hasTouch ||= pointerType === 'touch' && type === 'pointerdown';
    hasPen ||= isPen;
    hasHover ||= isHover;
    if (isPen && !isEnd) {
        maxTilt = Math.max(
            maxTilt,
            Math.abs(event.tiltX ?? 0),
            Math.abs(event.tiltY ?? 0),
        );
        if (hasTipContact) {
            minPressure = Math.min(minPressure, event.pressure);
            maxPressure = Math.max(maxPressure, event.pressure);
        }
    }

    const previousMask = buttonMasks.get(pointerId) ?? 0;
    // A lenyomott hegy mellett az oldalgomb változása pointermove-ként is érkezhet.
    if (!isEnd && (previousMask !== mask || button >= 0)) {
        const pressed = mask & ~previousMask;
        const released = previousMask & ~mask;
        const sideButtons = pressed & ~1;
        logInput(
            event,
            `${pointerType} #${pointerId} button=${button} buttons=${mask}  +${pressed} −${released}`,
            sideButtons
                ? `pointer · ${pointerType} · +${sideButtons}`
                : undefined,
        );
    }
    if (isEnd || mask === 0) buttonMasks.delete(pointerId);
    else buttonMasks.set(pointerId, mask);

    if (type === 'pointerdown') canvas.setPointerCapture(pointerId);
    if (hasTipContact) draw(event, x, y);
    else strokes.delete(pointerId);

    // A capture elvesztése ne írja felül a közvetlenül előtte érkezett pointerup adatait.
    if (type !== 'lostpointercapture') {
        let phase = 'mozgás / gomb';
        if (type === 'pointercancel') phase = 'megszakítva';
        else if (type === 'pointerleave' || !isInside) phase = 'vásznon kívül';
        else if (hasTipContact) phase = 'hegy érintkezik';
        else if (isHover) phase = 'lebeg';

        latest = {
            event,
            x,
            y,
            phase,
            isVisible:
                !isEnd &&
                isInside &&
                (pointerType !== 'touch' || hasTipContact),
        };
    }
    queueRender();
}

for (const type of [
    'pointermove',
    'pointerdown',
    'pointerup',
    'pointercancel',
    'pointerleave',
    'lostpointercapture',
]) {
    canvas.addEventListener(type, onPointer);
}
for (const type of ['mousedown', 'mouseup', 'contextmenu', 'auxclick']) {
    canvas.addEventListener(type, onMouseAction);
}
canvas.addEventListener('keydown', onKey);
canvas.addEventListener('keyup', onKey);
document.querySelector('#clear').addEventListener('click', () => {
    ink.save();
    ink.resetTransform();
    ink.clearRect(0, 0, canvas.width, canvas.height);
    ink.restore();
    strokes.clear();
    buttonMasks.clear();
    buttonLog.length = 0;
    signals.clear();
    binding.options.length = 1;
    binding.value = '';
    eventNumber = actionCount = 0;
    canvas.parentElement.classList.remove('is-triggered');
    action.textContent = 'Tesztművelet · 0';
    hasTouch = hasPen = hasHover = false;
    minPressure = Infinity;
    maxPressure = -Infinity;
    maxTilt = 0;
    latest = undefined;
    queueRender();
});

resizeCanvas();
new ResizeObserver(resizeCanvas).observe(canvas);
window.addEventListener('resize', resizeCanvas);
render();
