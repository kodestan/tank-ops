import { GameConfig, GameResult, GameState } from "./game-objects.js";
import { Vector } from "./vector.js";
import { DisplayDriver } from "./display-driver.js";
import { Grid } from "./grid.js";
import { UI, UIMode } from "./ui.js";
import { Notifier } from "./notifier.js";
import { GameEvent, GameEventType } from "./game-event.js";
import { WsDriver } from "./ws-driver.js";
import { AudioDriver } from "./audio-driver.js";

const WS_URL = "ws";
const AUDIO_FAIL_MESSAGE = "failed to load audio";

function resultString(result: GameResult): string {
  switch (result) {
    case GameResult.Win:
      return "you won!";
    case GameResult.Draw:
      return "draw";
    case GameResult.Lose:
      return "you lost...";
  }
}

function elementToScreenCoords(elementP: Vector): Vector {
  return elementP.mul(window.devicePixelRatio).round();
}

enum Layer {
  UI,
  Grid,
}

export class Game {
  audioDriver: AudioDriver;
  notifier: Notifier;
  displayDriver: DisplayDriver;
  wsDriver: WsDriver;
  grid: Grid | null = null;
  ui: UI;
  isPointerDown = false;
  layer: Layer = Layer.UI;
  freeze: boolean = false;
  states: {
    mainMenu: StateGame;
    waitingForRoom: StateGame;
    waitingRoom: StateGame;
    inGame: StateGame;
  };
  state: StateGame;
  pointerPosition: Vector = new Vector(0, 0);

  constructor(ctx: CanvasRenderingContext2D) {
    this.notifier = new Notifier(this);
    this.audioDriver = new AudioDriver(this.notifier);
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

    this.states = {
      mainMenu: new GameStateMainMenu(this),
      waitingForRoom: new GameStateWaitForRoom(this),
      waitingRoom: new GameStateWaitingRoom(this),
      inGame: new GameStateInGame(this),
    };
    this.state = this.states.mainMenu;
  }

  public update(event: GameEvent) {
    this.state.update(event);
  }

  public setState(state: StateGame) {
    this.state = state;
    this.state.onEnter();
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
      this.pointerPosition = screenP;
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

  public initGrid(config: GameConfig) {
    const gameState = new GameState(config);
    this.grid = new Grid(
      gameState,
      this.displayDriver,
      config,
      this.notifier,
      this.audioDriver,
    );
    this.displayDriver.gameState = gameState;
    this.displayDriver.reset();
  }

  public removeGrid() {
    this.grid = null;
    this.displayDriver.gameState = null;
  }

  public handleZoomIn() {
    this.displayDriver.handleZoomIn(this.pointerPosition);
  }

  public handleZoomOut() {
    this.displayDriver.handleZoomOut(this.pointerPosition);
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
    this.displayDriver.draw(this.freeze);
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

interface StateGame {
  str: string;
  update(event: GameEvent): void;
  onEnter(): void;
}

class GameStateMainMenu implements StateGame {
  str = "main-menu";
  game: Game;
  constructor(game: Game) {
    this.game = game;
  }

  onEnter(): void {
    this.game.audioDriver.setSoundGlobal(false);
  }

  update(event: GameEvent) {
    switch (event.type) {
      case GameEventType.WsOpen:
        this.game.ui.setOnlineGameAvailability(true);
        break;
      case GameEventType.WsClose:
        this.game.freeze = false;
        this.game.ui.setOnlineGameAvailability(false);
        this.game.ui.addModal("connection lost");
        break;
      case GameEventType.ButtonJoinRoom:
        const code = this.game.ui.getRoomCode();
        this.game.wsDriver.sendStartGame(code);
        this.game.freeze = true;
        this.game.setState(this.game.states.waitingForRoom);
        break;
      case GameEventType.AudioLoadFail:
        this.game.ui.addModal(AUDIO_FAIL_MESSAGE);
        break;
      case GameEventType.AudioLoadSuccess:
        this.game.ui.allowUnmute();
        break;
    }
  }
}

class GameStateWaitForRoom implements StateGame {
  str = "wait-for-room";
  game: Game;
  constructor(game: Game) {
    this.game = game;
  }

  onEnter(): void {
    this.game.audioDriver.setSoundGlobal(false);
  }

  update(event: GameEvent): void {
    switch (event.type) {
      case GameEventType.WsOpen:
        this.game.ui.setOnlineGameAvailability(true);
        break;
      case GameEventType.WsClose:
        this.game.freeze = false;
        this.game.ui.setOnlineGameAvailability(false);
        this.game.ui.addModal("connection lost");
        this.game.setState(this.game.states.mainMenu);
        break;
      case GameEventType.RoomJoined:
        this.game.freeze = false;
        this.game.ui.enableMode(UIMode.WaitingRoom);
        this.game.setState(this.game.states.waitingRoom);
        break;
      case GameEventType.RoomDisconnected:
        this.game.freeze = false;
        this.game.ui.addModal("cant join room");
        this.game.setState(this.game.states.mainMenu);
        break;
      case GameEventType.AudioLoadFail:
        this.game.ui.addModal(AUDIO_FAIL_MESSAGE);
        break;
      case GameEventType.AudioLoadSuccess:
        this.game.ui.allowUnmute();
        break;
    }
  }
}
class GameStateWaitingRoom implements StateGame {
  str = "waiting-room";
  game: Game;
  constructor(game: Game) {
    this.game = game;
  }

  onEnter(): void {
    this.game.audioDriver.setSoundGlobal(false);
  }

  update(event: GameEvent): void {
    switch (event.type) {
      case GameEventType.WsOpen:
        this.game.ui.setOnlineGameAvailability(true);
        break;
      case GameEventType.WsClose:
        this.game.ui.setOnlineGameAvailability(false);
        this.game.ui.addModal("connection lost");
        this.game.ui.enableMode(UIMode.Main);
        this.game.setState(this.game.states.mainMenu);
        break;
      case GameEventType.StartGame:
        this.game.initGrid(event.config);
        this.game.ui.enableMode(UIMode.InGame);
        this.game.setState(this.game.states.inGame);
        break;
      case GameEventType.RoomDisconnected:
        this.game.ui.addModal("room disconnected");
        this.game.ui.enableMode(UIMode.Main);
        this.game.setState(this.game.states.mainMenu);
        this.game.freeze;
        break;
      case GameEventType.ButtonQuitGame:
        this.game.wsDriver.sendQuitRoom();
        this.game.ui.enableMode(UIMode.Main);
        this.game.setState(this.game.states.mainMenu);
        break;
      case GameEventType.AudioLoadFail:
        this.game.ui.addModal(AUDIO_FAIL_MESSAGE);
        break;
      case GameEventType.AudioLoadSuccess:
        this.game.ui.allowUnmute();
        break;
    }
  }
}
class GameStateInGame implements StateGame {
  game: Game;
  isAnimating: boolean = false;

  str = "in-game";
  modalQueue: string[] = [];
  gameFinished: boolean = false;
  counterIncoming: number = 0;
  counterFinished: number = 0;

  constructor(game: Game) {
    this.game = game;
  }

  onEnter() {
    this.game.audioDriver.setSoundGlobal(true);
    this.isAnimating = false;
    this.modalQueue = [];
    this.gameFinished = false;
    this.counterIncoming = 0;
    this.counterFinished = 0;

    this.game.ui.setSendTurnAvailability(true);
  }

  update(event: GameEvent): void {
    switch (event.type) {
      case GameEventType.ReceiveTurnResults:
        this.counterIncoming++;
        this.game.grid?.pushResults(event.turnResults);
        this.game.ui.setSendTurnAvailability(false);
        this.isAnimating = true;
        break;
      case GameEventType.GameFinished:
        this.gameFinished = true;
        this.game.ui.setSendTurnAvailability(false);
        if (this.isAnimating) {
          this.modalQueue.push(resultString(event.result));
          return;
        }
        this.game.ui.addModal(resultString(event.result));
        break;
      case GameEventType.WsClose:
        this.game.ui.setSendTurnAvailability(false);
        this.game.ui.setOnlineGameAvailability(false);
        this.game.ui.addModal("server disconnected");
        this.game.removeGrid();
        this.game.ui.enableMode(UIMode.Main);
        this.game.setState(this.game.states.mainMenu);
        break;
      case GameEventType.RoomDisconnected:
        this.game.ui.setSendTurnAvailability(false);
        if (this.gameFinished) {
          return;
        }
        if (this.isAnimating) {
          this.modalQueue.push("room disconnected");
          return;
        }
        this.game.ui.addModal("room disconnected");
        this.game.removeGrid();
        this.game.ui.enableMode(UIMode.Main);
        this.game.setState(this.game.states.mainMenu);
        break;
      case GameEventType.ButtonZoomIn:
        this.game.handleZoomIn();
        break;
      case GameEventType.ButtonZoomOut:
        this.game.handleZoomOut();
        break;
      case GameEventType.ButtonQuitGame:
        if (!this.gameFinished) {
          this.game.wsDriver.sendQuitRoom();
        }
        this.game.removeGrid();
        this.game.ui.enableMode(UIMode.Main);
        this.game.setState(this.game.states.mainMenu);
        break;
      case GameEventType.ButtonSendTurn:
        if (this.game.grid === null) return;
        this.game.ui.setSendTurnAvailability(false);
        const actions = this.game.grid.getActions();
        this.game.wsDriver.sendActions(actions);
        break;
      case GameEventType.AnimationEnd:
        this.counterFinished++;
        if (this.counterFinished === this.counterIncoming) {
          this.isAnimating = false;
          this.game.ui.setSendTurnAvailability(!this.gameFinished);
          for (const modalText of this.modalQueue) {
            this.game.ui.addModal(modalText);
          }
        }
        break;
      case GameEventType.TankManipulation:
        if (!this.gameFinished && !this.isAnimating) {
          this.game.ui.setSendTurnAvailability(true);
        }
        break;
      case GameEventType.AudioLoadFail:
        this.game.ui.addModal(AUDIO_FAIL_MESSAGE);
        break;
      case GameEventType.AudioLoadSuccess:
        this.game.ui.allowUnmute();
        break;
      case GameEventType.ButtonUnmute:
        this.game.ui.setAudioButton(true);
        this.game.audioDriver.setSoundInGame(true);
        break;
      case GameEventType.ButtonMute:
        this.game.ui.setAudioButton(false);
        this.game.audioDriver.setSoundInGame(false);
        break;
    }
  }
}
