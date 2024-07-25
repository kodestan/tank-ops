import { Hex, GameConfig, GameState } from "./game-objects.js";
import { Vector } from "./vector.js";
import { DisplayDriver } from "./display-driver.js";

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
  displayDriver: DisplayDriver;

  constructor(ctx: CanvasRenderingContext2D, config: GameConfig) {
    const gameState = new GameState(config);

    this.displayDriver = new DisplayDriver(ctx, gameState);

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
