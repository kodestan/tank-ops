import { Vector } from "./vector.js";

export type GameConfig = {
  hexes: { p: Vector; variant: number }[];
  playerTanks: { p: Vector }[];
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
  p: Vector;
  angleBody: number;
  angleTurret: number;
};

export class GameState {
  hexes: Map<string, Hex>;
  sites: Site[];
  playerTanks: Tank[];

  constructor(config: GameConfig) {
    this.hexes = new Map(
      config.hexes.map((h) => [h.p.toString(), { p: h.p, variant: h.variant }]),
    );
    this.sites = config.sites.map((s) => ({ p: s.p, variant: s.variant }));
    this.playerTanks = config.playerTanks.map((t) => ({
      p: t.p,
      angleBody: 0,
      angleTurret: 0,
    }));
  }
}
