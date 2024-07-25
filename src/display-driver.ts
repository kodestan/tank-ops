import { Vector } from "./vector.js";
import { SPRITES_64, SPRITES_96, SpritePreset, Sprite } from "./sprites.js";
import { GameState } from "./game-objects.js";

type SpriteConfig = { scale: number; sprites: SpritePreset };

const SPRITES_IMAGE_SRC = "./assets/sprites.png";

class DisplaySettings {
  ctx: CanvasRenderingContext2D;
  cameraOffset: Vector = new Vector(0, 0);
  spriteConfigs: SpriteConfig[] = [
    { scale: 1, sprites: SPRITES_64 }, // 64
    { scale: 1, sprites: SPRITES_96 }, // 96
    { scale: 2, sprites: SPRITES_64 }, // 128
    { scale: 2, sprites: SPRITES_96 }, // 192
    { scale: 4, sprites: SPRITES_64 }, // 256
    { scale: 3, sprites: SPRITES_96 }, // 288
    { scale: 4, sprites: SPRITES_96 }, // 384
  ];
  presetIdx: number = 1;
  curPreset = this.spriteConfigs[this.presetIdx];

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

  public zoom(zoomIn: boolean) {
    if (zoomIn && this.presetIdx === this.spriteConfigs.length - 1) return;
    if (!zoomIn && this.presetIdx === 0) return;
    if (zoomIn) {
      this.presetIdx++;
    } else {
      this.presetIdx--;
    }
    const oldHexWidth = this.curPreset.sprites.hexSize.x * this.curPreset.scale;

    this.curPreset = this.spriteConfigs[this.presetIdx];

    const newHexWidth = this.curPreset.sprites.hexSize.x * this.curPreset.scale;

    const center = new Vector(
      this.ctx.canvas.width,
      this.ctx.canvas.height,
    ).mul(0.5);

    this.cameraOffset = this.cameraOffset
      .sub(center)
      .mul(newHexWidth / oldHexWidth)
      .add(center);
  }

  public addCameraOffset(v: Vector) {
    this.cameraOffset = this.cameraOffset.add(v);
  }

  public getHexSprite(variant: number): Sprite {
    return this.curPreset.sprites.hexes.light[variant];
  }

  public getSiteSprite(variant: number): Sprite {
    return this.curPreset.sprites.sites.light[variant];
  }

  public getTankSprites(
    angleBody: number,
    angleTurret: number,
  ): { body: Sprite; turret: Sprite } {
    const len = this.curPreset.sprites.tanksBodies.length;
    const bodyIdx = Math.min(
      len - 1,
      Math.max(0, Math.round((angleBody / 360) * len)),
    );
    const turretIdx = Math.min(
      len - 1,
      Math.max(0, Math.round((angleTurret / 360) * len)),
    );
    const body = this.curPreset.sprites.tanksBodies[bodyIdx];
    const turret = this.curPreset.sprites.tanksTurrets[turretIdx];
    return { body: body, turret: turret };
  }

  public getHexSize(): Vector {
    return this.curPreset.sprites.hexSize.mul(this.curPreset.scale);
  }

  public gridToScreenCoords(p: Vector): Vector {
    const hexSize = this.getHexSize();
    const y = (p.y * hexSize.y * 3) / 4;
    const x = p.x * hexSize.x + 0.5 * p.y * hexSize.x;
    return new Vector(x, y).add(this.cameraOffset);
  }

  public screenToGridCoords(p: Vector): Vector {
    const worldCoords = p.sub(this.cameraOffset);
    const hexSize = this.getHexSize();
    let y = ((worldCoords.y / hexSize.y) * 4) / 3;
    let x = worldCoords.x / hexSize.x - y / 2;
    const roundX = Math.round(x);
    const roundY = Math.round(y);
    x -= roundX;
    y -= roundY;
    const dx = Math.round(x + 0.5 * y) * Number(x * x >= y * y);
    const dy = Math.round(y + 0.5 * x) * Number(x * x < y * y);
    return new Vector(roundX + dx, roundY + dy);
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

    const tempPointer = this.gameState.tempCurPointer;
    this.ctx.save();
    this.ctx.textAlign = "center";
    this.ctx.font = "bold 48px monospace";

    const gridCoords = this.displaySettings.screenToGridCoords(tempPointer);
    const screenCoords = this.displaySettings.gridToScreenCoords(gridCoords);

    this.ctx.fillStyle = "red";
    this.ctx.fillRect(screenCoords.x - 10, screenCoords.y - 10, 20, 20);

    this.ctx.fillText(
      `x: ${gridCoords.x.toString().slice(0, 5)}, y: ${gridCoords.y.toString().slice(0, 5)}`,
      screenCoords.x,
      screenCoords.y - 30,
    );
    this.ctx.restore();
  }

  public resize() {
    this.displaySettings.resize();
  }

  public handleZoomIn() {
    this.displaySettings.zoom(true);
  }

  public handleZoomOut() {
    this.displaySettings.zoom(false);
  }

  public addCameraOffset(v: Vector) {
    this.displaySettings.addCameraOffset(v);
  }

  private drawSprite(sprite: Sprite, p: Vector) {
    const screenCords = this.displaySettings.gridToScreenCoords(p).round();
    const scale = this.displaySettings.curPreset.scale;
    const start = screenCords.add(sprite.offset.mul(scale));
    const size = sprite.size.mul(scale);
    this.ctx.imageSmoothingEnabled = false;
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
