import { GameConfig, GameState } from "./game-objects.js";
import { Vector } from "./vector.js";
import { DisplayDriver } from "./display-driver.js";
import { Grid } from "./grid.js";
import { UI, UIMode } from "./ui.js";
import { Notifier } from "./notifier.js";
import { GameEvent, GameEventType } from "./game-event.js";
import { WsDriver } from "./ws-driver.js";

const WS_URL = "ws";

function elementToScreenCoords(elementP: Vector): Vector {
  return elementP.mul(window.devicePixelRatio).round();
}

// export const BASE_CONFIG: GameConfig = {
//   hexes: [
//     { p: new Vector(0, 0), variant: 0 },
//     { p: new Vector(1, 0), variant: 1 },
//     { p: new Vector(2, 0), variant: 2 },
//     { p: new Vector(2, 1), variant: 1 },
//     { p: new Vector(3, 1), variant: 2 },
//     { p: new Vector(4, 1), variant: 0 },
//     { p: new Vector(0, 2), variant: 1 },
//     { p: new Vector(1, 2), variant: 1 },
//     { p: new Vector(2, 2), variant: 1 },
//     { p: new Vector(3, 2), variant: 1 },
//     { p: new Vector(-1, 3), variant: 1 },
//     { p: new Vector(0, 3), variant: 1 },
//     // { p: new Vector(1, 3), variant: 1 },
//     { p: new Vector(2, 3), variant: 1 },
//     { p: new Vector(3, 3), variant: 1 },
//     { p: new Vector(-2, 4), variant: 1 },
//     { p: new Vector(-1, 4), variant: 1 },
//     { p: new Vector(0, 4), variant: 1 },
//     { p: new Vector(1, 4), variant: 1 },
//     // { p: new Vector(2, 4), variant: 1 },
//     // { p: new Vector(3, 4), variant: 1 },
//     // { p: new Vector(4, 4), variant: 1 },
//     // { p: new Vector(5, 4), variant: 1 },
//     { p: new Vector(-2, 5), variant: 1 },
//     { p: new Vector(-1, 5), variant: 1 },
//     // { p: new Vector(0, 5), variant: 1 },
//     // { p: new Vector(1, 5), variant: 1 },
//     // { p: new Vector(2, 5), variant: 1 },
//     { p: new Vector(-3, 6), variant: 1 },
//     { p: new Vector(-2, 6), variant: 1 },
//     // { p: new Vector(-1, 6), variant: 1 },
//     // { p: new Vector(0, 6), variant: 1 },
//     // { p: new Vector(1, 6), variant: 1 },
//     { p: new Vector(-3, 7), variant: 1 },
//     { p: new Vector(-2, 7), variant: 1 },
//     { p: new Vector(-1, 7), variant: 1 },
//     { p: new Vector(-3, 8), variant: 1 },
//     { p: new Vector(-2, 8), variant: 1 },
//     { p: new Vector(-3, 9), variant: 1 },
//   ],
//
//   playerTanks: [
//     { id: 2, p: new Vector(-3, 8) },
//     { id: 3, p: new Vector(0, 0) },
//     { id: 4, p: new Vector(2, 0) },
//   ],
//
//   enemyTanks: [{ id: 8, p: new Vector(-2, 6) }],
//
//   sites: [
//     { p: new Vector(2, 2), variant: 2 },
//     { p: new Vector(4, 1), variant: 4 },
//     { p: new Vector(-2, 8), variant: 5 },
//     { p: new Vector(-3, 7), variant: 6 },
//   ],
// };

enum Layer {
  UI,
  Grid,
}

export class Game {
  notifier: Notifier;
  displayDriver: DisplayDriver;
  wsDriver: WsDriver;
  grid: Grid | null = null;
  ui: UI;
  isPointerDown = false;
  layer: Layer = Layer.UI;

  constructor(ctx: CanvasRenderingContext2D) {
    this.notifier = new Notifier(this);
    this.wsDriver = new WsDriver(WS_URL, this.notifier);
    const canvas = ctx.canvas;
    this.initEventListeners(canvas);

    const inputElement = this.createInputElement();
    ctx.canvas.parentNode?.insertBefore(inputElement, null);
    this.ui = new UI(this.notifier, inputElement);
    this.displayDriver = new DisplayDriver(ctx, null, this.ui);

    window.addEventListener("resize", () => {
      this.resize();
    });
    this.resize();
  }

  public update(event: GameEvent) {
    switch (event.type) {
      case GameEventType.StartGame:
        this.initGrid(event.config);
        this.ui.enableMode(UIMode.InGame);
        break;
      case GameEventType.ButtonJoinRoom:
        const code = this.ui.getRoomCode();
        this.wsDriver.sendStartGame(code);
        break;
      case GameEventType.ButtonZoomIn:
        this.handleZoomIn();
        break;
      case GameEventType.ButtonZoomOut:
        this.handleZoomOut();
        break;
      case GameEventType.ButtonSendTurn:
        if (this.grid === null) return;
        const actions = this.grid.getActions();
        this.wsDriver.sendActions(actions);
        break;
      case GameEventType.ButtonQuitGame:
        this.removeGrid();
        this.ui.enableMode(UIMode.Main);
        break;
      case GameEventType.WsOpen:
        this.ui.setOnlineGameAvailability(true);
        break;
      case GameEventType.WsClose:
        this.ui.setOnlineGameAvailability(false);
        break;
      case GameEventType.ReceiveTurnResults:
        this.grid?.pushResults(event.turnResults);
        break;
      case GameEventType.GameFinished:
        console.log("game finished");
        break;
      case GameEventType.RoomJoined:
        console.log("room joined");
        break;
      case GameEventType.RoomDisconnected:
        console.log("room disconnected");
        break;
      case GameEventType.NoneEvent:
        console.log("none event");
        break;
    }
  }

  public run() {
    this.draw(0);
  }

  private initEventListeners(canvas: HTMLCanvasElement) {
    canvas.addEventListener("pointerdown", (e: PointerEvent) => {
      const screenP = elementToScreenCoords(new Vector(e.offsetX, e.offsetY));
      this.handlePointerStart(screenP);
    });
    canvas.addEventListener("pointerup", (e: PointerEvent) => {
      const screenP = elementToScreenCoords(new Vector(e.offsetX, e.offsetY));
      this.handlePointerEnd(screenP);
    });
    canvas.addEventListener("pointermove", (e: PointerEvent) => {
      const screenP = elementToScreenCoords(new Vector(e.offsetX, e.offsetY));
      this.handlePointerMove(screenP);
    });
    canvas.addEventListener("wheel", (e: WheelEvent) => {
      if (e.deltaY > 0) {
        this.handleZoomOut();
        return;
      }
      this.handleZoomIn();
    });
  }

  private createInputElement(): HTMLInputElement {
    const e = document.createElement("input");
    e.setAttribute("id", "in-game-input");
    e.setAttribute("type", "text");
    e.setAttribute("placeholder", "code");
    return e;
  }

  private initGrid(config: GameConfig) {
    const gameState = new GameState(config);
    this.grid = new Grid(gameState, this.displayDriver, config);
    this.displayDriver.gameState = gameState;
    this.displayDriver.reset();
  }

  private removeGrid() {
    this.grid = null;
    this.displayDriver.gameState = null;
  }

  private handleZoomIn() {
    this.displayDriver.handleZoomIn();
  }

  private handleZoomOut() {
    this.displayDriver.handleZoomOut();
  }

  private handlePointerStart(p: Vector) {
    this.isPointerDown = true;
    this.layer = this.ui.collides(p) ? Layer.UI : Layer.Grid;
    if (this.layer === Layer.UI) {
      this.ui.handlePointerStart(p);
    } else {
      this.grid?.handlePointerStart(p);
    }
  }

  private handlePointerEnd(p: Vector) {
    this.isPointerDown = false;
    if (this.layer === Layer.UI) {
      this.ui.handlePointerEnd(p);
    } else {
      this.grid?.handlePointerEnd(p);
    }
    this.layer = Layer.UI;
  }

  private handlePointerMove(p: Vector) {
    if (!this.isPointerDown) return;
    if (this.layer === Layer.UI) {
      this.ui.handlePointerMove(p);
    } else {
      this.grid?.handlePointerMove(p);
    }
  }

  private draw(curT: number) {
    this.displayDriver.draw();
    this.grid?.setT(curT);
    this.grid?.tick();
    requestAnimationFrame((t: number) => {
      this.draw(t);
    });
  }

  private resize() {
    this.displayDriver.resize();
  }
}