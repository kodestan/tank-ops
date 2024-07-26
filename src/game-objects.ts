import { Vector } from "./vector.js";

export type GameConfig = {
  hexes: { p: Vector; variant: number }[];
  playerTanks: { id: number; p: Vector }[];
  sites: { p: Vector; variant: number }[];
};

export type Hex = {
  p: Vector;
  variant: number;
  traversable: boolean;
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
  shooting: boolean;
  shootingDir: number;
};

export class GameState {
  hexes: Map<string, Hex>;
  sites: Site[];
  playerTanks: Tank[];
  visibleHexes: Set<string> = new Set();
  availableHexes: Set<string> = new Set();
  conditionallyAvailableHexes: Set<string> = new Set();

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
      angleBody: 0,
      angleTurret: 0,
      path: [],
      shooting: false,
      shootingDir: 0,
    }));
  }
}
