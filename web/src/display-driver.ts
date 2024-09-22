import { unitVectorToIdx, Vector } from "./vector.js";
import {
  SPRITES_64,
  SPRITES_96,
  SpritePreset,
  Sprite,
  ValidPathsKeys,
} from "./sprites.js";
import { GameState, getTankById } from "./game-objects.js";
import { ButtonState, UI } from "./ui.js";

type SpriteConfig = { scale: number; sprites: SpritePreset };

const SPRITES_IMAGE_SRC = "./assets/sprites.png";
const GREEN_HIGHLIGHT_IDX = 0;
const YELLOW_HIGHLIGHT_IDX = 1;
const DEFAULT_PRESET_IDX = 1;
export const SMOKE_MARK_IDX = 0;
export const SHRINK_MARK_IDX = 1;

export class DisplayDriver {
  backgroundColor: string = "rgb(50, 50, 50)";
  ctx: CanvasRenderingContext2D;
  gameState: GameState | null;
  ui: UI;
  sprites: HTMLImageElement;

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
  presetIdx: number = DEFAULT_PRESET_IDX;
  curPreset = this.spriteConfigs[this.presetIdx];

  constructor(
    ctx: CanvasRenderingContext2D,
    gameState: GameState | null,
    ui: UI,
  ) {
    this.ctx = ctx;
    this.gameState = gameState;
    this.ui = ui;
    this.sprites = new Image();
    this.sprites.src = SPRITES_IMAGE_SRC;
  }

  public draw(freeze: boolean) {
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.drawHexes();
    this.drawOverlays();
    this.drawPaths();
    this.drawTanks();
    this.drawSites();
    this.drawExplosions();
    this.drawUI();

    if (freeze) {
      this.ctx.save();
      this.ctx.fillStyle = "black";
      this.ctx.globalAlpha = 0.6;
      const x = this.ctx.canvas.width;
      const y = this.ctx.canvas.height;
      this.ctx.fillRect(0, 0, x, y);
      this.ctx.restore();
    }
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

    this.ui.resize(canvasSize);
  }

  public reset() {
    this.presetIdx = DEFAULT_PRESET_IDX;
    this.curPreset = this.spriteConfigs[this.presetIdx];
    this.cameraOffset = Vector.zero();
  }

  public handleZoomIn(pointerPosition: Vector) {
    this.zoom(true, pointerPosition);
  }

  public handleZoomOut(pointerPosition: Vector) {
    this.zoom(false, pointerPosition);
  }

  private zoom(zoomIn: boolean, { x, y }: Vector) {
    if (zoomIn && this.presetIdx === this.spriteConfigs.length - 1) return;
    if (!zoomIn && this.presetIdx === 0) return;

    const oldHexWidth = this.curPreset.sprites.hexSize.x * this.curPreset.scale;

    this.presetIdx += zoomIn ? 1 : -1;
    this.curPreset = this.spriteConfigs[this.presetIdx];

    const newHexWidth = this.curPreset.sprites.hexSize.x * this.curPreset.scale;
    const zoomFactor = newHexWidth / oldHexWidth;

    const {left, top} = this.ctx.canvas.getBoundingClientRect();
    const pointerPos = new Vector(x - left, y - top);

    this.cameraOffset = pointerPos
      .add(this.cameraOffset.sub(pointerPos).mul(zoomFactor));
  }

  public addCameraOffset(v: Vector) {
    this.cameraOffset = this.cameraOffset.add(v);
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

  public gridToScreenCoords(p: Vector): Vector {
    const hexSize = this.getHexSize();
    const y = (p.y * hexSize.y * 3) / 4;
    const x = p.x * hexSize.x + 0.5 * p.y * hexSize.x;
    return new Vector(x, y).add(this.cameraOffset);
  }

  private drawSprite(sprite: Sprite, p: Vector) {
    const screenCords = this.gridToScreenCoords(p).round();
    const scale = this.curPreset.scale;
    const shakeOffset = (this.gameState?.cameraShake || Vector.zero()).mul(
      this.curPreset.sprites.hexSize.x * scale,
    );
    const start = screenCords
      .add(sprite.offset.mul(scale))
      .add(shakeOffset)
      .floor();
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

  private drawOverlays() {
    if (this.gameState === null) return;
    for (const overlay of this.gameState?.overlays) {
      if (!this.gameState.hexes.has(overlay.p.toString())) {
        continue;
      }
      const isLight = this.gameState.visibleHexes.has(overlay.p.toString());
      const sprite = this.getOverlaySprite(overlay.variant, isLight);
      this.drawSprite(sprite, overlay.p);
    }
  }

  private drawUI() {
    this.ctx.save();

    for (const button of this.ui.curButtons) {
      if (button.state === ButtonState.Invisible) continue;
      this.ctx.globalAlpha = 0.8;
      this.ctx.fillStyle = "white";
      if (button.state === ButtonState.Pressed) {
        this.ctx.fillStyle = "#444444";
      }
      if (button.state === ButtonState.Inactive) {
        this.ctx.fillStyle = "white";
      }

      this.ctx.fillRect(
        button.area.start.x,
        button.area.start.y,
        button.area.size.x,
        button.area.size.y,
      );

      let fontSize = button.baseFontSize;
      fontSize = Math.round(fontSize);
      this.ctx.font = `bold ${fontSize}px monospace`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillStyle = "black";
      if (button.state === ButtonState.Inactive) {
        this.ctx.fillStyle = "#444444";
        this.ctx.fillRect(
          button.area.start.x + 2,
          button.area.start.y + 2,
          button.area.size.x - 4,
          button.area.size.y - 4,
        );
        this.ctx.fillStyle = "white";
      }
      this.ctx.globalAlpha = 1;
      const center = button.area.start.add(button.area.size.mul(0.5)).round();
      this.ctx.fillText(button.text || "", center.x, center.y);
    }

    const modal = this.ui.getModal();
    if (modal !== null) {
      const area = modal.area;
      this.ctx.globalAlpha = 0.6;
      this.ctx.fillStyle = "white";
      this.ctx.fillRect(area.start.x, area.start.y, area.size.x, area.size.y);
      this.ctx.font = `bold ${modal.baseFontSize}px monospace`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.globalAlpha = 1;
      this.ctx.fillStyle = "black";
      const center = area.start.add(area.size.mul(0.5)).round();
      this.ctx.fillText(modal.text || "", center.x, center.y);

      this.ctx.lineWidth = modal.crossStrokeWidth;
      this.ctx.beginPath();
      const start = modal.crossArea.start;
      const end = start.add(modal.crossArea.size);
      this.ctx.moveTo(start.x, start.y);
      this.ctx.lineTo(end.x, end.y);
      this.ctx.moveTo(start.x, end.y);
      this.ctx.lineTo(end.x, start.y);
      this.ctx.closePath();
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawExplosions() {
    if (this.gameState === null) return;

    if (this.gameState.firingExplosion.frac > 0) {
      const sprites = this.curPreset.sprites.smallExplosion;
      const idx = Math.min(
        sprites.length - 1,
        Math.floor(this.gameState.firingExplosion.frac * sprites.length),
      );
      const sprite = sprites[idx];
      this.drawSprite(sprite, this.gameState.firingExplosion.p);
    }

    if (this.gameState.explosion.frac > 0) {
      const sprites = this.curPreset.sprites.explosion;
      const idx = Math.min(
        sprites.length - 1,
        Math.floor(this.gameState.explosion.frac * sprites.length),
      );
      const sprite = sprites[idx];
      this.drawSprite(sprite, this.gameState.explosion.p);
    }
  }

  private drawPaths() {
    if (this.gameState === null) return;
    let moveIdx = 0;
    for (const id of this.gameState.turnOrder) {
      const tank = getTankById(this.gameState.playerTanks, id);
      if (tank === null) continue;
      if (tank.path.length < 2) continue;

      const vStart = tank.path[1].sub(tank.path[0]);
      const vEnd = tank.path[tank.path.length - 2].sub(
        tank.path[tank.path.length - 1],
      );
      const variantStart = unitVectorToIdx(vStart);
      const variantEnd = unitVectorToIdx(vEnd);

      const spriteStart = this.getPathSprite(moveIdx, variantStart.toString());
      const spriteEnd = this.getPathSprite(moveIdx, variantEnd.toString());

      const triangleVariant = [0, 2, 4].includes(variantEnd)
        ? "arrowL"
        : "arrowR";
      const spriteTriangle = this.getPathSprite(moveIdx, triangleVariant);

      this.drawSprite(spriteStart, tank.p);
      this.drawSprite(spriteEnd, tank.path[tank.path.length - 1]);
      this.drawSprite(spriteTriangle, tank.path[tank.path.length - 1]);

      for (let i = 0; i < tank.path.length - 2; i++) {
        const p1 = tank.path[i];
        const p2 = tank.path[i + 1];
        const p3 = tank.path[i + 2];
        const variants = this.getPathSegmentVariants(
          p1,
          p2,
          p3,
        ) as ValidPathsKeys[];
        for (const variant of variants) {
          const sprite = this.getPathSprite(moveIdx, variant);
          this.drawSprite(sprite, p2);
        }
      }
      moveIdx++;
    }

    for (const tank of this.gameState.playerTanks) {
      if (tank.shooting) {
        const sprite = this.getAimSprite(tank.shootingDir);
        this.drawSprite(sprite, tank.p);
      }
    }
  }

  private getPathSegmentVariants(p1: Vector, p2: Vector, p3: Vector): string[] {
    const v1 = p1.sub(p2);
    const v2 = p3.sub(p2);
    const idx1 = unitVectorToIdx(v1);
    const idx2 = unitVectorToIdx(v2);
    if (Math.abs(idx1 - idx2) === 3) {
      return [idx1.toString(), idx2.toString()];
    }
    return [Math.min(idx1, idx2).toString() + Math.max(idx1, idx2).toString()];
  }

  private drawHexes() {
    if (this.gameState === null) return;

    this.ctx.save();

    for (const hex of this.gameState.hexes.values()) {
      const sprite = this.getHexSprite(
        hex.variant,
        this.gameState.visibleHexes.has(hex.p.toString()),
      );

      this.ctx.globalAlpha = hex.opacity;
      this.drawSprite(sprite, hex.p);
      if (this.gameState.conditionallyAvailableHexes.has(hex.p.toString())) {
        const sprite = this.getHighlightSprite(YELLOW_HIGHLIGHT_IDX);
        this.drawSprite(sprite, hex.p);
      }
      if (this.gameState.availableHexes.has(hex.p.toString())) {
        const sprite = this.getHighlightSprite(GREEN_HIGHLIGHT_IDX);
        this.drawSprite(sprite, hex.p);
      }
    }

    this.ctx.restore();
  }

  private drawSites() {
    if (this.gameState === null) return;
    for (const site of this.gameState.sites) {
      if (!this.gameState.hexes.has(site.p.toString())) {
        continue;
      }
      const sprite = this.getSiteSprite(
        site.variant,
        this.gameState.visibleHexes.has(site.p.toString()),
      );
      this.drawSprite(sprite, site.p);
    }
  }

  private drawTanks() {
    if (this.gameState === null) return;
    for (const tank of this.gameState.playerTanks) {
      if (!tank.visible) continue;
      const sprite = this.getTankSprites(
        true,
        tank.angleBody,
        tank.angleTurret,
      );
      this.drawSprite(sprite.body, tank.pF);
      this.drawSprite(sprite.turret, tank.pF);
    }
    for (const tank of this.gameState.enemyTanks) {
      if (!tank.visible) continue;
      const sprite = this.getTankSprites(
        false,
        tank.angleBody,
        tank.angleTurret,
      );
      this.drawSprite(sprite.body, tank.pF);
      this.drawSprite(sprite.turret, tank.pF);
    }
  }

  private getHexSize(): Vector {
    return this.curPreset.sprites.hexSize.mul(this.curPreset.scale);
  }

  private getAimSprite(variant: number): Sprite {
    return this.curPreset.sprites.overlays.aim[variant];
  }

  private getHexSprite(variant: number, light: boolean): Sprite {
    if (light) {
      return this.curPreset.sprites.hexes.light[variant];
    }
    return this.curPreset.sprites.hexes.dark[variant];
  }

  private getSiteSprite(variant: number, light: boolean): Sprite {
    if (light) {
      return this.curPreset.sprites.sites.light[variant];
    }
    return this.curPreset.sprites.sites.dark[variant];
  }

  private getTankSprites(
    isPlayer: boolean,
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
    let body = this.curPreset.sprites.tanksBodies[bodyIdx];
    let turret = this.curPreset.sprites.tanksTurrets[turretIdx];
    if (!isPlayer) {
      body = this.curPreset.sprites.enemyTanksBodies[bodyIdx];
      turret = this.curPreset.sprites.enemyTanksTurrets[turretIdx];
    }
    return { body: body, turret: turret };
  }

  private getHighlightSprite(variant: number): Sprite {
    return this.curPreset.sprites.overlays.highlights[variant];
  }

  private getOverlaySprite(variant: number, light: boolean): Sprite {
    const overlays = this.curPreset.sprites.overlays.markers;
    if (light) {
      return overlays.light[variant];
    }
    return overlays.dark[variant];
  }

  private getPathSprite(idx: number, variant: string) {
    const len = this.curPreset.sprites.overlays.paths.length;
    idx = idx % len;
    return this.curPreset.sprites.overlays.paths[idx][
      variant as ValidPathsKeys
    ];
  }
}
