import { GameState } from "./game-objects.js";
import { Vector } from "./vector.js";

export class Grid {
  gameState: GameState;
  lastPoint: null | Vector = null;
  isPointerDown = false;

  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  handlePointerStart(p: Vector) {
    this.lastPoint = p;
    this.isPointerDown = true;
  }

  handlePointerMove(p: Vector) {
    if (!this.isPointerDown) return;
    if (this.lastPoint === null) return;
    this.gameState.cameraOffset = this.gameState.cameraOffset.add(
      p.sub(this.lastPoint),
    );
    this.lastPoint = p;
  }

  handlePointerEnd(p: Vector) {
    this.lastPoint = null;
    this.isPointerDown = false;
  }
}
