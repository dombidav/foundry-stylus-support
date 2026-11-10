/// <reference types="@dfreds/foundry-types" />

/**
 * The native initialized Game instance type derived from Foundry's asynchronous creation API.
 *
 * @example
 * const current: FoundryGame = game;
 */
export type FoundryGame = Awaited<ReturnType<typeof foundry.Game.create>>;

// The upstream package exposes these types but omits their singleton globals.
declare global {
    const game: FoundryGame;
    const ui: typeof foundry.ui;
    const canvas: foundry.canvas.Canvas | null;
}
