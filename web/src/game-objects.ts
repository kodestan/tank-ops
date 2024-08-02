import { SMOKE_MARK_IDX } from "./display-driver.js";
import { Vector } from "./vector.js";

export function getTankById(tanks: Tank[], id: number): Tank | null {
  for (const tank of tanks) {
    if (tank.id === id) {
      return tank;
    }
  }
  return null;
}

export enum GameResult {
  Win = 1,
  Draw = 2,
  Lose = 3,
}

enum TankActionType {
  Move = 1,
  Fire = 2,
}

export type TankMove = {
  type: TankActionType.Move;
  id: number;
  path: Vector[];
};

export type TankFire = {
  type: TankActionType.Fire;
  id: number;
  dir: Vector;
};

export function newTankFire(id: number, dir: Vector): TankFire {
  return { type: TankActionType.Fire, id: id, dir: dir };
}

export function newTankMove(id: number, path: Vector[]): TankMove {
  return { type: TankActionType.Move, id: id, path: path };
}

export type TankAction = TankMove | TankFire;

export type GameConfig = {
  hexes: { p: Vector; variant: number }[];
  playerTanks: { id: number; p: Vector }[];
  enemyTanks: { id: number; p: Vector }[];
  sites: { p: Vector; variant: number }[];
  driveRange: number;
  visibilityRange: number;
  fireRange: number;
  center: Vector;
};

export type Hex = {
  p: Vector;
  variant: number;
  traversable: boolean;
};

export type Explosion = {
  frac: number;
  p: Vector;
};

export type Site = {
  p: Vector;
  variant: number;
};

export type Tank = {
  id: number;
  p: Vector;
  pF: Vector;
  angleBody: number;
  angleTurret: number;
  path: Vector[];
  shooting: boolean;
  shootingDir: number;
  visible: boolean;
};

export type Overlay = {
  p: Vector;
  variant: number;
};

export function newSmokeMark(p: Vector): Overlay {
  return { p: p, variant: SMOKE_MARK_IDX };
}

export enum TurnResultType {
  Move2 = 1,
  Move3 = 2,
  Fire = 3,
  Explosion = 4,
  Destroyed = 5,
  Visible = 6,
  Shrink = 7,
}

export type TurnResultMove2 = {
  type: TurnResultType.Move2;
  id: number;
  p1: Vector;
  p2: Vector;
  start: boolean;
};

export type TurnResultMove3 = {
  type: TurnResultType.Move3;
  id: number;
  p1: Vector;
  p2: Vector;
  p3: Vector;
};

export type TurnResultFire = {
  type: TurnResultType.Fire;
  id: number;
  dir: Vector;
};

export type TurnResultExplosion = {
  type: TurnResultType.Explosion;
  p: Vector;
  destroyed: boolean;
  id: number;
};

export type TurnResultDestroyed = {
  type: TurnResultType.Destroyed;
  p: Vector;
  id: number;
};

export type TurnResultVisible = {
  type: TurnResultType.Visible;
  id: number;
  p: Vector;
  visible: boolean;
};

export type TurnResultShrink = {
  type: TurnResultType.Shrink;
  r: number;
  started: boolean;
};

export type TurnResult =
  | TurnResultMove2
  | TurnResultMove3
  | TurnResultFire
  | TurnResultExplosion
  | TurnResultDestroyed
  | TurnResultVisible
  | TurnResultShrink;

export class GameState {
  hexes: Map<string, Hex>;
  sites: Site[];
  playerTanks: Tank[];
  enemyTanks: Tank[];
  visibleHexes: Set<string> = new Set();
  availableHexes: Set<string> = new Set();
  conditionallyAvailableHexes: Set<string> = new Set();
  turnOrder: number[] = [];
  overlays: Overlay[] = [];
  explosion: Explosion = { frac: 0, p: Vector.zero() };
  firingExplosion: Explosion = { frac: 0, p: Vector.zero() };

  constructor(config: GameConfig) {
    this.hexes = new Map(
      config.hexes.map((h) => [
        h.p.toString(),
        { p: h.p, variant: h.variant, traversable: true },
      ]),
    );
    this.sites = config.sites.map((s) => ({ p: s.p, variant: s.variant }));

    for (const site of this.sites) {
      const hex = this.hexes.get(site.p.toString());
      if (hex !== undefined) {
        hex.traversable = false;
      }
    }

    this.playerTanks = config.playerTanks.map((t) => ({
      id: t.id,
      p: t.p,
      pF: t.p,
      angleBody: 120,
      angleTurret: 134,
      path: [],
      shooting: false,
      shootingDir: 0,
      visible: true,
    }));

    this.enemyTanks = config.enemyTanks.map((t) => ({
      id: t.id,
      p: t.p,
      pF: t.p,
      angleBody: 304,
      angleTurret: 288,
      path: [],
      shooting: false,
      shootingDir: 0,
      visible: false,
    }));

    for (const et of this.enemyTanks.values()) {
      for (const pt of this.playerTanks.values()) {
        if (pt.p.gridDistance(et.p) <= config.visibilityRange) {
          et.visible = true;
          break;
        }
      }
    }
  }
}
