import { Hex, GameConfig, GameState } from "./game-objects.js";
import { Vector } from "./vector.js";
import { DisplayDriver } from "./display-driver.js";
import { Grid } from "./grid.js";

function elementToScreenCoords(elementP: Vector): Vector {
  return elementP.mul(window.devicePixelRatio).round();
}

export const BASE_CONFIG: GameConfig = {
  hexes: [
    { p: new Vector(0, 0), variant: 0 },
    { p: new Vector(1, 0), variant: 1 },
    { p: new Vector(2, 0), variant: 2 },
    { p: new Vector(2, 1), variant: 1 },
    { p: new Vector(3, 1), variant: 2 },
    { p: new Vector(4, 1), variant: 0 },
    { p: new Vector(2, 2), variant: 1 },
    { p: new Vector(-3, 8), variant: 1 },
    { p: new Vector(-2, 8), variant: 1 },
    { p: new Vector(-3, 9), variant: 1 },
  ],

  playerTanks: [{ p: new Vector(-3, 8) }, { p: new Vector(-3, 9) }],

  sites: [
    { p: new Vector(2, 2), variant: 2 },
    { p: new Vector(4, 1), variant: 4 },
    { p: new Vector(-2, 8), variant: 5 },
  ],
};

export class Game {
  grid: Grid;
  displayDriver: DisplayDriver;
  isPointerDown = false;

  constructor(ctx: CanvasRenderingContext2D, config: GameConfig) {
    const gameState = new GameState(config);
    const canvas = ctx.canvas;
    this.initEventListeners(canvas);

    this.displayDriver = new DisplayDriver(ctx, gameState);
    this.grid = new Grid(gameState);

    window.addEventListener("resize", () => {
      this.resize();
    });
    this.resize();
  }

  public run() {
    requestAnimationFrame(() => {
      this.draw();
    });
  }

  private initEventListeners(canvas: HTMLCanvasElement) {
    canvas.addEventListener("pointerdown", (e: PointerEvent) => {
      const screenP = elementToScreenCoords(new Vector(e.offsetX, e.offsetY));
      this.handlePointerStart(screenP);
    });
    canvas.addEventListener("pointerup", (e: PointerEvent) => {
      const screenP = elementToScreenCoords(new Vector(e.offsetX, e.offsetY));
      this.handlePointerEnd(screenP);
    });
    canvas.addEventListener("pointermove", (e: PointerEvent) => {
      const screenP = elementToScreenCoords(new Vector(e.offsetX, e.offsetY));
      this.handlePointerMove(screenP);
    });
  }

  private handlePointerStart(p: Vector) {
    this.isPointerDown = true;
    this.grid.handlePointerStart(p);
  }

  private handlePointerEnd(p: Vector) {
    this.isPointerDown = false;
    this.grid.handlePointerEnd(p);
  }

  private handlePointerMove(p: Vector) {
    if (!this.isPointerDown) return;
    this.grid.handlePointerMove(p);
  }

  private draw() {
    this.displayDriver.draw();
    requestAnimationFrame(() => {
      this.draw();
    });
  }

  private resize() {
    this.displayDriver.resize();
  }
}
