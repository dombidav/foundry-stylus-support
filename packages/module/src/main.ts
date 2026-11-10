import { onInit, onSetup, onReady } from './lifecycle.ts';

Hooks.once('init', onInit);
Hooks.once('setup', onSetup);
Hooks.once('ready', onReady);
