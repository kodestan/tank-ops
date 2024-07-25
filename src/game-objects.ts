import { Vector } from "./vector.js";

export type GameConfig = {
  hexes: { p: Vector; variant: number }[];
  playerTanks: { id: number; p: Vector }[];
  sites: { p: Vector; variant: number }[];
};

export type Hex = {
  p: Vector;
  variant: number;
};

export type Site = {
  p: Vector;
  variant: number;
};

export type Tank = {
  id: number;
  p: Vector;
  angleBody: number;
  angleTurret: number;
  path: Vector[];
};

export class GameState {
  hexes: Map<string, Hex>;
  sites: Site[];
  playerTanks: Tank[];
  tempCurPointer: Vector = new Vector(0, 0);

  constructor(config: GameConfig) {
    this.hexes = new Map(
      config.hexes.map((h) => [h.p.toString(), { p: h.p, variant: h.variant }]),
    );
    this.sites = config.sites.map((s) => ({ p: s.p, variant: s.variant }));
    this.playerTanks = config.playerTanks.map((t) => ({
      id: t.id,
      p: t.p,
      angleBody: 0,
      angleTurret: 0,
      path: [],
    }));
  }
}
