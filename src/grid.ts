import { DisplayDriver } from "./display-driver.js";
import { GameState, Tank } from "./game-objects.js";
import { includesVector, isNeighbor, Vector } from "./vector.js";

const T_PRESS_TO_FIRE = 600;

enum PointerMode {
  None,
  Drag,
  TankNavigation,
  TankFire,
}

export class Grid {
  gameState: GameState;
  displayDriver: DisplayDriver;
  // TODO move the config somewhere
  config = {
    maxRange: 10,
  };
  lastPoint: Vector = Vector.zero();
  curT = 0;
  pointerStartTime: number = 0;
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
    this.pointerStartTime = this.curT;

    const tank = this.getCollidingTank(p);
    if (tank !== null) {
      this.curMode = PointerMode.TankNavigation;
      tank.path = [];
      tank.shooting = false;
      tank.shootingDir = 0;
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
        if (
          this.curTank?.path.length === 0 &&
          this.curT - this.pointerStartTime > T_PRESS_TO_FIRE
        ) {
          this.curMode = PointerMode.TankFire;
          this.curTank.shooting = true;
          this.curTank.shootingDir = 0;
          this.handleTankFire(p);
        } else {
          this.handleTankNavigation(p);
        }
        break;
      case PointerMode.TankFire:
        this.handleTankFire(p);
    }
    this.lastPoint = p;
  }

  public handlePointerEnd(p: Vector) {
    this.isPointerDown = false;
    this.curMode = PointerMode.None;
    this.curTank = null;
  }

  public tick() {
    if (this.isPointerDown && this.curMode === PointerMode.TankNavigation) {
      this.handlePointerMove(this.lastPoint);
    }
  }

  private handleDrag(p: Vector) {
    if (this.lastPoint === null) return;
    this.displayDriver.addCameraOffset(p.sub(this.lastPoint));
  }

  private handleTankFire(p: Vector) {
    if (this.curTank === null) return;
    const v = p.sub(this.displayDriver.gridToScreenCoords(this.curTank.p));
    this.curTank.shootingDir = Math.floor((v.angle() + 30) / 60) % 6;
  }

  private handleTankNavigation(p: Vector) {
    if (this.curTank === null) return;
    const gridP = this.displayDriver.screenToGridCoords(p);
    if (this.curTank.path.length > this.config.maxRange) return;
    if (gridP.eq(this.curTank.p)) return;
    const lastOnPath =
      this.curTank.path.length > 0
        ? this.curTank.path[this.curTank.path.length - 1]
        : this.curTank.p;
    if (!isNeighbor(lastOnPath, gridP)) return;
    if (includesVector(this.curTank.path, gridP)) return;
    if (!this.gameState.hexes.has(gridP.toString())) return;
    if (!this.gameState.hexes.get(gridP.toString())?.traversable) return;

    if (this.curTank.path.length === 0) {
      this.curTank.path.push(this.curTank.p);
    }
    this.curTank.path.push(gridP);
  }

  private getCollidingTank(p: Vector): Tank | null {
    const gridP = this.displayDriver.screenToGridCoords(p);
    for (const tank of this.gameState.playerTanks) {
      if (tank.p.eq(gridP)) {
        return tank;
      }
    }
    return null;
  }
}
