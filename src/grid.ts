import { DisplayDriver } from "./display-driver.js";
import {
  GameConfig,
  GameState,
  getTankById,
  newTankFire,
  newTankMove,
  Tank,
  TankAction,
  TurnResult,
  TurnResultType,
} from "./game-objects.js";
import {
  idxToUnitVector,
  includesVector,
  isNeighbor,
  Vector,
} from "./vector.js";

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
  config: {
    driveRange: number;
    visibilityRange: number;
  };
  lastPoint: Vector = Vector.zero();
  curT = 0;
  pointerStartTime: number = 0;
  isPointerDown = false;
  curMode: PointerMode = PointerMode.None;

  curTank: Tank | null = null;

  constructor(
    gameState: GameState,
    displayDriver: DisplayDriver,
    config: GameConfig,
  ) {
    this.gameState = gameState;
    this.displayDriver = displayDriver;
    this.config = {
      driveRange: config.driveRange,
      visibilityRange: config.visibilityRange,
    };
    this.recalculateVisibleHexes();
  }

  public getActions(): TankAction[] {
    const actions: TankAction[] = [];
    for (const idx of this.gameState.turnOrder) {
      const tank = getTankById(this.gameState.playerTanks, idx);
      if (tank === null) continue;
      if (tank.shooting) {
        const shootingVec = idxToUnitVector(tank.shootingDir);
        if (shootingVec === null) continue;
        actions.push(newTankFire(idx, shootingVec));
      } else if (tank.path.length >= 1) {
        actions.push(newTankMove(idx, tank.path));
      }
    }
    return actions;
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
      this.recalculateTraversable();
      this.saveOrder(tank.id);
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
          this.curT - this.pointerStartTime > T_PRESS_TO_FIRE &&
          this.curTank?.p.eq(this.displayDriver.screenToGridCoords(p))
        ) {
          this.curMode = PointerMode.TankFire;
          this.curTank.shooting = true;
          this.curTank.shootingDir = 0;
          this.gameState.availableHexes.clear();
          this.gameState.conditionallyAvailableHexes.clear();
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
    if (
      this.curTank !== null &&
      this.curMode === PointerMode.TankNavigation &&
      this.curTank.path.length === 0
    ) {
      this.removeOrder(this.curTank.id);
    }
    this.curMode = PointerMode.None;
    this.curTank = null;
    this.recalculateTraversable();
    console.log(this.gameState.turnOrder);
  }

  public tick() {
    if (this.isPointerDown && this.curMode === PointerMode.TankNavigation) {
      this.handlePointerMove(this.lastPoint);
    }
  }

  public setT(t: number) {
    this.curT = t;
  }

  public animate(turnResults: TurnResult[]) {
    this.clearPathsAndAims();
    for (const res of turnResults) {
      switch (res.type) {
        case TurnResultType.Move2:
          const tank = getTankById(this.gameState.playerTanks, res.id);
          if (tank === null) break;
          tank.p = res.p1;
          if (!res.start) {
            tank.p = res.p2;
          }
          break;
        case TurnResultType.Move3:
          const t = getTankById(this.gameState.playerTanks, res.id);
          if (t === null) break;
          t.p = res.p2;
          break;
      }
    }
    this.recalculateVisibleHexes();
  }

  private clearPathsAndAims() {
    for (const tank of this.gameState.playerTanks) {
      tank.path = [];
      tank.shooting = false;
      tank.shootingDir = 0;
    }
  }

  private saveOrder(id: number) {
    this.removeOrder(id);
    this.gameState.turnOrder.push(id);
  }

  private removeOrder(id: number) {
    const idx = this.gameState.turnOrder.indexOf(id);
    if (idx !== -1) {
      this.gameState.turnOrder.splice(idx, 1);
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
    if (this.curTank.path.length > this.config.driveRange) return;
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

    this.recalculateTraversable();
  }

  private recalculateTraversable() {
    this.recalculateAvailableHexes(this.gameState.availableHexes, false);
    this.recalculateAvailableHexes(
      this.gameState.conditionallyAvailableHexes,
      true,
    );
  }

  private recalculateAvailableHexes(set: Set<string>, conditional: boolean) {
    set.clear();
    if (this.curTank === null) {
      return;
    }
    let start = this.curTank.p;
    let range = this.config.driveRange;
    if (this.curTank.path.length > 0) {
      start = this.curTank.path[this.curTank.path.length - 1];
      range -= this.curTank.path.length - 1;
    }
    if (range <= 0) {
      return;
    }

    const unavailable: Set<string> = new Set();
    if (!conditional) {
      for (const tank of this.gameState.playerTanks) {
        if (tank.id === this.curTank.id) continue;
        unavailable.add(tank.p.toString());
      }
      for (const tank of this.gameState.enemyTanks) {
        unavailable.add(tank.p.toString());
      }
    }

    for (let i = 0; i < this.curTank.path.length - 1; i++) {
      if (unavailable.has(this.curTank.path[i].toString()) && !conditional) {
        set.clear();
        return;
      }
      unavailable.add(this.curTank.path[i].toString());
    }
    if (
      this.curTank.path.length > 0 &&
      unavailable.has(
        this.curTank.path[this.curTank.path.length - 1].toString(),
      ) &&
      !conditional
    ) {
      set.clear();
      return;
    }

    let frontier = [start];
    set.add(start.toString());

    for (let i = 0; i < range; i++) {
      let newFrontier = [];
      for (const p of frontier) {
        for (const n of p.neighbors()) {
          if (set.has(n.toString())) {
            continue;
          }
          const hex = this.gameState.hexes.get(n.toString());
          if (hex === undefined || !hex.traversable) {
            continue;
          }
          if (unavailable.has(n.toString())) {
            continue;
          }
          // checks
          set.add(n.toString());
          newFrontier.push(n);
        }
      }
      frontier = newFrontier;
    }

    set.delete(start.toString());
  }

  private recalculateVisibleHexes() {
    console.log("recalc", this.config);
    this.gameState.visibleHexes.clear();

    for (const tank of this.gameState.playerTanks) {
      for (const hex of this.gameState.hexes.values()) {
        if (tank.p.gridDistance(hex.p) <= this.config.visibilityRange) {
          this.gameState.visibleHexes.add(hex.p.toString());
        }
      }
    }
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
