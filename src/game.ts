import { Hex } from "./game-objects.js";
import { Vector } from "./vector.js";

const SPRITES_IMAGE_SRC = "./assets/sprites.png";

export const BASE_CONFIG: GameConfig = {
  hexes: [
    { p: new Vector(0, 0), variant: 0 },
    { p: new Vector(2, 1), variant: 1 },
    { p: new Vector(3, 1), variant: 2 },
    { p: new Vector(4, 1), variant: 0 },
    { p: new Vector(2, 2), variant: 1 },
  ],
};

export type GameConfig = {
  hexes: { p: Vector; variant: number }[];
};

class GameState {
  hexes: Map<string, Hex>;

  constructor(config: GameConfig) {
    this.hexes = new Map(
      config.hexes.map((h) => [h.p.toString(), { p: h.p, variant: h.variant }]),
    );
  }
}

class Drawer {
  backgroundColor: string = "rgb(50, 50, 50)";
  ctx: CanvasRenderingContext2D;
  gameState: GameState;
  displaySettings: DisplaySettings;
  sprites: HTMLImageElement;

  constructor(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
    displaySettings: DisplaySettings,
  ) {
    this.ctx = ctx;
    this.gameState = gameState;
    this.displaySettings = displaySettings;
    this.sprites = new Image();
    this.sprites.src = SPRITES_IMAGE_SRC;
  }

  public draw() {
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.drawHexes();
  }

  private drawHexes() {
    for (const hex of this.gameState.hexes.values()) {
      const screenCords = this.displaySettings.getScreenCords(hex.p).round();
      const spriteCords = this.displaySettings.getHexSprite(hex.variant);
      const start = screenCords.add(spriteCords.offset);
      const size = spriteCords.sourceSize;
      this.ctx.drawImage(
        this.sprites,
        spriteCords.sourceStart.x,
        spriteCords.sourceStart.y,
        spriteCords.sourceSize.x,
        spriteCords.sourceSize.y,
        start.x,
        start.y,
        size.x,
        size.y,
      );
    }
  }
}

type Sprite = {
  sourceStart: Vector;
  sourceSize: Vector;
  offset: Vector;
};

type SpritePreset = {
  hexSize: Vector;
  hexes: Sprite[];
};

class DisplaySettings {
  ctx: CanvasRenderingContext2D;
  origin: Vector = new Vector(0, 0);
  spritePreset: SpritePreset = {
    hexSize: new Vector(96, 56),
    hexes: [
      {
        sourceStart: new Vector(0, 836),
        sourceSize: new Vector(96, 64),
        offset: new Vector(-48, -28),
      },
      {
        sourceStart: new Vector(0, 964),
        sourceSize: new Vector(96, 64),
        offset: new Vector(-48, -28),
      },
      {
        sourceStart: new Vector(101, 64),
        sourceSize: new Vector(96, 64),
        offset: new Vector(-48, -28),
      },
    ],
  };

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public resize() {
    const rect = this.ctx.canvas.parentElement!.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio;

    const screen = new Vector(rect.width, rect.height);
    this.ctx.canvas.style.width = `${screen.x}px`;
    this.ctx.canvas.style.height = `${screen.y}px`;

    const canvasSize = screen.mul(pixelRatio);

    this.ctx.canvas.width = canvasSize.x;
    this.ctx.canvas.height = canvasSize.y;
  }

  public getHexSprite(variant: number): Sprite {
    return this.spritePreset.hexes[variant];
  }

  public getHexSize(): Vector {
    return this.spritePreset.hexSize;
  }

  public getScreenCords(p: Vector): Vector {
    const hexSize = this.spritePreset.hexSize;
    const y = (p.y * hexSize.y * 3) / 4;
    const x = p.x * hexSize.x + 0.5 * p.y * hexSize.x;
    return new Vector(x, y);
  }
}

export class Game {
  drawer: Drawer;
  displaySettings: DisplaySettings;

  constructor(ctx: CanvasRenderingContext2D, config: GameConfig) {
    const gameState = new GameState(config);

    this.displaySettings = new DisplaySettings(ctx);
    this.drawer = new Drawer(ctx, gameState, this.displaySettings);

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
    this.drawer.draw();
    requestAnimationFrame(() => {
      this.draw();
    });
  }

  private resize() {
    this.displaySettings.resize();
  }
}
