import { Vector } from "./vector.js";
import { SPRITES_64, SPRITES_96, SpritePreset, Sprite } from "./sprites.js";
import { GameState } from "./game-objects.js";

const SPRITES_IMAGE_SRC = "./assets/sprites.png";

class DisplaySettings {
  ctx: CanvasRenderingContext2D;
  origin: Vector = new Vector(0, 0);
  spritePresets: { 64: SpritePreset; 96: SpritePreset } = {
    64: SPRITES_64,
    96: SPRITES_96,
  };
  curPreset: SpritePreset = SPRITES_96;

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
    return this.curPreset.hexes.light[variant];
  }

  public getSiteSprite(variant: number): Sprite {
    return this.curPreset.sites.light[variant];
  }

  public getTankSprites(
    angleBody: number,
    angleTurret: number,
  ): { body: Sprite; turret: Sprite } {
    const len = this.curPreset.tanksBodies.length;
    const bodyIdx = Math.min(
      len - 1,
      Math.max(0, Math.round((angleBody / 360) * len)),
    );
    const turretIdx = Math.min(
      len - 1,
      Math.max(0, Math.round((angleTurret / 360) * len)),
    );
    const body = this.curPreset.tanksBodies[bodyIdx];
    const turret = this.curPreset.tanksTurrets[turretIdx];
    return { body: body, turret: turret };
  }

  public getHexSize(): Vector {
    return this.curPreset.hexSize;
  }

  public getScreenCords(p: Vector): Vector {
    const hexSize = this.curPreset.hexSize;
    const y = (p.y * hexSize.y * 3) / 4;
    const x = p.x * hexSize.x + 0.5 * p.y * hexSize.x;
    return new Vector(x, y);
  }
}

export class DisplayDriver {
  backgroundColor: string = "rgb(50, 50, 50)";
  ctx: CanvasRenderingContext2D;
  gameState: GameState;
  displaySettings: DisplaySettings;
  sprites: HTMLImageElement;

  constructor(ctx: CanvasRenderingContext2D, gameState: GameState) {
    this.ctx = ctx;
    this.gameState = gameState;
    this.displaySettings = new DisplaySettings(this.ctx);
    this.sprites = new Image();
    this.sprites.src = SPRITES_IMAGE_SRC;
  }

  public draw() {
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.drawHexes();
    this.drawSites();
    this.drawTanks();
  }

  public resize() {
    this.displaySettings.resize();
  }

  private drawSprite(sprite: Sprite, p: Vector) {
    const screenCords = this.displaySettings.getScreenCords(p).round();
    const start = screenCords.add(sprite.offset);
    const size = sprite.size;
    this.ctx.drawImage(
      this.sprites,
      sprite.start.x,
      sprite.start.y,
      sprite.size.x,
      sprite.size.y,
      start.x,
      start.y,
      size.x,
      size.y,
    );
  }

  private drawHexes() {
    for (const hex of this.gameState.hexes.values()) {
      const sprite = this.displaySettings.getHexSprite(hex.variant);
      this.drawSprite(sprite, hex.p);
    }
  }

  private drawSites() {
    for (const site of this.gameState.sites) {
      const sprite = this.displaySettings.getSiteSprite(site.variant);
      this.drawSprite(sprite, site.p);
    }
  }

  private drawTanks() {
    for (const tank of this.gameState.playerTanks) {
      const sprite = this.displaySettings.getTankSprites(
        tank.angleBody,
        tank.angleTurret,
      );
      this.drawSprite(sprite.body, tank.p);
      this.drawSprite(sprite.turret, tank.p);
    }
  }
}
