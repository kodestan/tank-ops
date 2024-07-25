import { DisplayDriver } from "./display-driver.js";
import { GameState, Tank } from "./game-objects.js";
import { includesVector, isNeighbor, Vector } from "./vector.js";

enum PointerMode {
  None,
  Drag,
  TankNavigation,
}

export class Grid {
  gameState: GameState;
  displayDriver: DisplayDriver;
  config = {
    maxRange: 10,
  };
  lastPoint: null | Vector = null;
  isPointerDown = false;
  curMode: PointerMode = PointerMode.None;

  curTank: Tank | null = null;

  constructor(gameState: GameState, displayDriver: DisplayDriver) {
    this.gameState = gameState;
    this.displayDriver = displayDriver;
  }

  public handlePointerStart(p: Vector) {
    this.lastPoint = p;
    this.isPointerDown = true;

    const tank = this.getCollidingTank(p);
    if (tank !== null) {
      this.curMode = PointerMode.TankNavigation;
      tank.path = [];
      this.curTank = tank;
      return;
    }

    this.curMode = PointerMode.Drag;
  }

  public handlePointerMove(p: Vector) {
    if (!this.isPointerDown) return;
    switch (this.curMode) {
      case PointerMode.None:
        break;
      case PointerMode.Drag:
        this.handleDrag(p);
        break;
      case PointerMode.TankNavigation:
        this.handleTankNavigation(p);
        break;
    }
    this.lastPoint = p;
  }

  public handlePointerEnd(p: Vector) {
    this.lastPoint = null;
    this.isPointerDown = false;
    this.curMode = PointerMode.None;
    this.curTank = null;
  }

  public TEMPHandlePointerMove(p: Vector) {
    this.gameState.tempCurPointer = p;
  }

  private handleDrag(p: Vector) {
    if (this.lastPoint === null) return;
    this.displayDriver.addCameraOffset(p.sub(this.lastPoint));
  }

  private handleTankNavigation(p: Vector) {
    if (this.curTank === null) return;
    const gridP = this.displayDriver.displaySettings.screenToGridCoords(p);
    if (this.curTank.path.length > this.config.maxRange) return;
    if (gridP.eq(this.curTank.p)) return;
    const lastOnPath =
      this.curTank.path.length > 0
        ? this.curTank.path[this.curTank.path.length - 1]
        : this.curTank.p;
    if (!isNeighbor(lastOnPath, gridP)) return;
    if (includesVector(this.curTank.path, gridP)) return;

    if (this.curTank.path.length === 0) {
      this.curTank.path.push(this.curTank.p);
    }
    this.curTank.path.push(gridP);
    console.log(this.curTank.path);
  }

  private getCollidingTank(p: Vector): Tank | null {
    // TODO not access display settings from here
    const gridP = this.displayDriver.displaySettings.screenToGridCoords(p);
    for (const tank of this.gameState.playerTanks) {
      if (tank.p.eq(gridP)) {
        return tank;
      }
    }
    return null;
  }
}
