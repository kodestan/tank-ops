import { DisplayDriver } from "./display-driver.js";
import { GameState } from "./game-objects.js";
import { Vector } from "./vector.js";

export class Grid {
  gameState: GameState;
  displayDriver: DisplayDriver;
  lastPoint: null | Vector = null;
  isPointerDown = false;

  constructor(gameState: GameState, displayDriver: DisplayDriver) {
    this.gameState = gameState;
    this.displayDriver = displayDriver;
  }

  handlePointerStart(p: Vector) {
    this.lastPoint = p;
    this.isPointerDown = true;
  }

  handlePointerMove(p: Vector) {
    if (!this.isPointerDown) return;
    if (this.lastPoint === null) return;
    this.displayDriver.addCameraOffset(p.sub(this.lastPoint));
    this.lastPoint = p;
  }

  handlePointerEnd(p: Vector) {
    this.lastPoint = null;
    this.isPointerDown = false;
  }
}
