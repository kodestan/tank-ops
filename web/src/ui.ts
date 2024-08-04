import { GameEvent, GameEventType, TypeOnlyEvent } from "./game-event.js";
import { Notifier } from "./notifier.js";
import { Vector } from "./vector.js";

type Area = { start: Vector; size: Vector };

export enum ButtonState {
  Normal,
  Pressed,
  Inactive,
  Invisible,
}

function boxCollision(area: Area, p: Vector): boolean {
  const end = area.start.add(area.size);
  if (
    p.x >= area.start.x &&
    p.y >= area.start.y &&
    p.x <= end.x &&
    p.y <= end.y
  ) {
    return true;
  }
  return false;
}

interface Button {
  area: Area;
  text?: string;
  state: ButtonState;
  // TODO change name to fontSize
  baseFontSize: number;
  // TODO change to default value
  fontSizeMultiplier?: number;

  collides(p: Vector): boolean;
  getEvent(): GameEvent;
  // only needed for text input
  resize(): void;
}

class Modal implements Button {
  area: Area;
  text: string;
  state: ButtonState = ButtonState.Normal;
  baseFontSize: number;
  fontSizeMultiplier?: number | undefined;

  crossArea: Area = newArea(0, 0, 0, 0);
  crossStrokeWidth: number = 0;

  constructor(fontSizeMultiplier: number = 1) {
    this.area = newArea(0, 0, 0, 0);
    this.text = "";
    this.baseFontSize = 0;
    this.fontSizeMultiplier = fontSizeMultiplier;
  }

  collides(p: Vector): boolean {
    return boxCollision(this.crossArea, p);
  }

  resize() {
    this.crossStrokeWidth = Math.floor(this.baseFontSize * 0.22);
    const length = Math.floor(
      Math.min(this.area.size.x, this.area.size.y) * 0.08,
    );
    const size = new Vector(length, length);
    const startX = this.area.start.x + this.area.size.x - 2 * length;
    const startY = this.area.start.y + 1 * length;
    const start = new Vector(startX, startY);
    this.crossArea = { start: start, size: size };
  }

  getEvent(): GameEvent {
    return { type: GameEventType.NoneEvent };
  }
}

class StandardButton implements Button {
  area: Area;
  text: string;
  baseFontSize: number;
  fontSizeMultiplier?: number;
  state: ButtonState = ButtonState.Normal;
  event: GameEvent;

  constructor(
    text: string,
    eventType: TypeOnlyEvent,
    fontSizeMultiplier?: number,
  ) {
    this.area = newArea(0, 0, 0, 0);
    this.text = text;
    this.baseFontSize = 0;
    if (fontSizeMultiplier !== undefined) {
      this.fontSizeMultiplier = fontSizeMultiplier;
    }
    this.event = { type: eventType };
  }

  public collides(p: Vector): boolean {
    return boxCollision(this.area, p);
  }

  public getEvent(): GameEvent {
    return this.event;
  }

  resize() {
    // only needed for text input
  }
}

class TextInput implements Button {
  area: Area;
  state: ButtonState;
  baseFontSize: number;
  fontSizeMultiplier?: number;
  element: HTMLInputElement;

  constructor(element: HTMLInputElement, fontSizeMultiplier?: number) {
    this.area = newArea(0, 0, 0, 0);
    this.state = ButtonState.Invisible;
    this.baseFontSize = 0;
    if (fontSizeMultiplier !== undefined) {
      this.fontSizeMultiplier = fontSizeMultiplier;
    }

    element.maxLength = 5;
    element.style.fontFamily = "monospace";
    this.element = element;
  }

  public hide() {
    this.element.style.display = "none";
    this.element.value = "";
  }

  public show() {
    this.element.style.display = "";
  }

  collides(p: Vector): boolean {
    const end = this.area.start.add(this.area.size);
    if (
      p.x >= this.area.start.x &&
      p.y >= this.area.start.y &&
      p.x <= end.x &&
      p.y <= end.y
    ) {
      return true;
    }
    return false;
  }

  getEvent(): GameEvent {
    return { type: GameEventType.NoneEvent };
  }

  resize() {
    const mul = 1 / window.devicePixelRatio;
    const start = this.area.start.mul(mul).round();
    const size = this.area.size.mul(mul).round();
    const borderWidth = this.area.size.y * 0.08 * mul;
    this.element.style.left = `${start.x}px`;
    this.element.style.top = `${start.y}px`;
    this.element.style.width = `${size.x}px`;
    this.element.style.height = `${size.y}px`;
    this.element.style.fontSize = `${this.baseFontSize * mul}px`;
    this.element.style.borderBottom = `${borderWidth}px solid white`;
  }
}

function newArea(
  startX: number,
  startY: number,
  sizeX: number,
  sizeY: number,
): Area {
  return { start: new Vector(startX, startY), size: new Vector(sizeX, sizeY) };
}

type PanelSizing = {
  maxWidth: number;
  maxHeight: number;
  grid: Vector;
  buff: number;
  // as % of width / grid.x
  baseFontSize: number;
  align?: Align;
  aspectRatio?: number;
  minAspectRatio?: number;
};

type DirectionalPanelData = {
  sizing: PanelSizing;
  buttonAreas: Area[];
};

function applyAspectRatio(
  aspectRatio: number,
  space: Vector,
  min: boolean = false,
): Vector {
  if (space.y === 0) {
    return new Vector(0, 0);
  }
  const spaceAspectRatio = space.x / space.y;

  if (spaceAspectRatio <= aspectRatio) {
    const x = space.x;
    const y = space.x / aspectRatio;
    return new Vector(x, y);
  }
  if (min) {
    return new Vector(space.x, space.y);
  }
  const y = space.y;
  const x = y * aspectRatio;
  return new Vector(x, y);
}

enum Align {
  Start,
  Center,
  End,
}

class Panel {
  area: Area;
  buttons: Button[] = [];

  horizontal: DirectionalPanelData;
  vertical: DirectionalPanelData;

  constructor(horizontal: PanelSizing, vertical: PanelSizing) {
    this.horizontal = { sizing: horizontal, buttonAreas: [] };
    this.vertical = { sizing: vertical, buttonAreas: [] };
    this.area = newArea(0, 0, 0, 0);
  }

  public attachButton(button: Button, horArea: Area, verArea: Area) {
    this.horizontal.buttonAreas.push(horArea);
    this.vertical.buttonAreas.push(verArea);
    this.buttons.push(button);
  }

  public resize(available: Vector) {
    if (available.y === 0) {
      this.area = newArea(0, 0, 0, 0);
      return;
    }
    const aspectRatio = available.x / available.y;
    const panel = aspectRatio >= 1 ? this.horizontal : this.vertical;

    const afterMax = new Vector(
      available.x * panel.sizing.maxWidth,
      available.y * panel.sizing.maxHeight,
    );

    let size = afterMax;
    if (panel.sizing.aspectRatio !== undefined) {
      size = applyAspectRatio(panel.sizing.aspectRatio, afterMax);
    } else if (panel.sizing.minAspectRatio) {
      size = applyAspectRatio(panel.sizing.minAspectRatio, afterMax, true);
    }

    this.area = newArea(0, 0, size.x, size.y);
    const leftover = available.sub(size);
    if (panel.sizing.align === Align.End) {
      this.area.start = leftover;
    }
    if (panel.sizing.align === Align.Center) {
      this.area.start = leftover.mul(0.5);
    }

    const buffer = panel.sizing.buff * Math.min(size.x, size.y);

    const cellSize = new Vector(
      (size.x - (panel.sizing.grid.x + 1) * buffer) / panel.sizing.grid.x,
      (size.y - (panel.sizing.grid.y + 1) * buffer) / panel.sizing.grid.y,
    );

    const fontSize =
      ((size.x / panel.sizing.grid.x) * panel.sizing.baseFontSize) / 100;

    for (const [i, area] of panel.buttonAreas.entries()) {
      const buttonSize = area.size
        .matmul(cellSize)
        .add(area.size.sub(new Vector(1, 1)).mul(buffer))
        .floor();
      const buttonStart = this.area.start
        .add(area.start.matmul(cellSize))
        .add(area.start.add(new Vector(1, 1)).mul(buffer))
        .round();
      const button = this.buttons[i];
      button.area = { start: buttonStart, size: buttonSize };
      button.baseFontSize = fontSize;
      if (button.fontSizeMultiplier !== undefined) {
        button.baseFontSize *= button.fontSizeMultiplier;
      }
      button.baseFontSize = Math.round(button.baseFontSize);
      button.resize();
    }
  }
}

export enum UIMode {
  Main,
  InGame,
}

export class UI {
  notifier: Notifier;
  panels: Panel[];
  buttons: Map<UIMode, Button[]> = new Map();
  curButtons: Button[] = [];
  modal: Modal;
  modalTextQueue: string[] = [];

  specialButtons: {
    joinRoom: StandardButton;
    textInput: TextInput;
  };

  constructor(notifier: Notifier, inputElement: HTMLInputElement) {
    this.notifier = notifier;

    const inGameMenuPanel = new Panel(
      {
        maxWidth: 0.27,
        maxHeight: 1,
        buff: 0.04,
        baseFontSize: 24,
        aspectRatio: 1 / 3,
        grid: new Vector(2, 8),
      },
      {
        maxWidth: 1,
        maxHeight: 0.25,
        buff: 0.05,
        baseFontSize: 12,
        minAspectRatio: 3.0,
        grid: new Vector(3, 2),
      },
    );
    const mainMenuPanel = new Panel(
      {
        maxWidth: 1,
        maxHeight: 0.88,
        buff: 0.04,
        baseFontSize: 20,
        aspectRatio: 2 / 3,
        align: Align.Center,
        grid: new Vector(4, 8),
      },
      {
        maxWidth: 0.8,
        maxHeight: 0.88,
        buff: 0.05,
        baseFontSize: 20,
        aspectRatio: 2 / 3,
        align: Align.Center,
        grid: new Vector(4, 8),
      },
    );
    const modalPanel = new Panel(
      {
        maxWidth: 0.8,
        maxHeight: 0.88,
        buff: 0.04,
        baseFontSize: 20,
        minAspectRatio: 1 / 3,
        align: Align.Center,
        grid: new Vector(4, 8),
      },
      {
        maxWidth: 0.8,
        maxHeight: 0.88,
        buff: 0.05,
        baseFontSize: 20,
        minAspectRatio: 1 / 3,
        align: Align.Center,
        grid: new Vector(4, 8),
      },
    );

    this.panels = [inGameMenuPanel, mainMenuPanel, modalPanel];

    const buttonSendTurn = new StandardButton(
      "send turn",
      GameEventType.ButtonSendTurn,
    );
    const buttonQuitGame = new StandardButton(
      "quit game",
      GameEventType.ButtonQuitGame,
    );
    const buttonZoomIn = new StandardButton(
      "+",
      GameEventType.ButtonZoomIn,
      1.5,
    );
    const buttonZoomOut = new StandardButton(
      "-",
      GameEventType.ButtonZoomOut,
      1.5,
    );
    inGameMenuPanel.attachButton(
      buttonSendTurn,
      newArea(0, 0, 2, 1),
      newArea(0, 0, 1, 1),
    );
    inGameMenuPanel.attachButton(
      buttonQuitGame,
      newArea(0, 1, 2, 1),
      newArea(0, 1, 1, 1),
    );
    inGameMenuPanel.attachButton(
      buttonZoomIn,
      newArea(0, 2, 2, 1),
      newArea(1, 0, 1, 1),
    );
    inGameMenuPanel.attachButton(
      buttonZoomOut,
      newArea(0, 3, 2, 1),
      newArea(1, 1, 1, 1),
    );

    const inGameButtons = [
      buttonSendTurn,
      buttonQuitGame,
      buttonZoomIn,
      buttonZoomOut,
    ];
    this.buttons.set(UIMode.InGame, inGameButtons);

    const buttonInputRoomCode = new TextInput(inputElement);
    mainMenuPanel.attachButton(
      buttonInputRoomCode,
      newArea(1, 1, 2, 1),
      newArea(1, 1, 2, 1),
    );

    const buttonJoinRoom = new StandardButton(
      "join room",
      GameEventType.ButtonJoinRoom,
    );
    mainMenuPanel.attachButton(
      buttonJoinRoom,
      newArea(1, 2, 2, 1),
      newArea(1, 2, 2, 1),
    );

    this.buttons.set(UIMode.Main, [buttonInputRoomCode, buttonJoinRoom]);

    this.curButtons = this.buttons.get(UIMode.Main) || [];

    buttonJoinRoom.state = ButtonState.Inactive;

    this.specialButtons = {
      joinRoom: buttonJoinRoom,
      textInput: buttonInputRoomCode,
    };

    this.modal = new Modal();
    modalPanel.attachButton(
      this.modal,
      newArea(0, 0, 4, 8),
      newArea(0, 0, 4, 8),
    );
  }

  public hasModal(): boolean {
    if (this.modalTextQueue.length > 0) {
      return true;
    }
    return false;
  }

  public getModal(): Modal | null {
    if (this.hasModal()) {
      return this.modal;
    }
    return null;
  }

  public addModal(text: string) {
    this.modalTextQueue.push(text);
    this.modal.text = text;
  }

  public removeModal() {
    this.modalTextQueue.pop();
    if (this.hasModal()) {
      this.modal.text = this.modalTextQueue[this.modalTextQueue.length - 1];
    }
  }

  public enableMode(mode: UIMode) {
    this.resetCurrent();
    this.curButtons = this.buttons.get(mode) || [];
    for (const button of this.curButtons) {
      if (button === this.specialButtons.textInput) {
        this.specialButtons.textInput.show();
      }
    }
  }

  public resize(space: Vector) {
    for (const panel of this.panels) {
      panel.resize(space);
    }
  }

  public handlePointerStart(p: Vector) {
    if (this.hasModal()) return;
    this.mark(p, ButtonState.Pressed);
  }

  public handlePointerMove(p: Vector) {
    if (this.hasModal()) return;
    this.mark(p, ButtonState.Pressed);
  }

  public handlePointerEnd(p: Vector) {
    if (this.hasModal()) {
      if (this.modal.collides(p)) {
        this.removeModal();
      }
      return;
    }
    for (const button of this.curButtons) {
      if (
        button.collides(p) &&
        button.state !== ButtonState.Inactive &&
        button.state !== ButtonState.Invisible
      ) {
        this.notifier.notify(button.getEvent());
      }
    }
    this.mark(p, ButtonState.Normal);
  }

  public collides(p: Vector): boolean {
    if (this.hasModal()) return true;
    for (const button of this.curButtons) {
      if (button.collides(p)) {
        return true;
      }
    }
    return false;
  }

  public setOnlineGameAvailability(available: boolean) {
    this.specialButtons.joinRoom.state = available
      ? ButtonState.Normal
      : ButtonState.Inactive;
  }

  public getRoomCode(): string {
    return this.specialButtons.textInput.element.value.toUpperCase();
  }

  private mark(p: Vector, state: ButtonState) {
    for (const button of this.curButtons) {
      if (
        button.state === ButtonState.Inactive ||
        button.state === ButtonState.Invisible
      )
        continue;
      button.state = ButtonState.Normal;
      if (button.collides(p)) {
        button.state = state;
      }
    }
  }

  private resetCurrent() {
    for (const button of this.curButtons) {
      if (button === this.specialButtons.textInput) {
        this.specialButtons.textInput.hide();
      }
      if (
        button.state === ButtonState.Inactive ||
        button.state === ButtonState.Invisible
      )
        continue;
      button.state = ButtonState.Normal;
    }
  }
}
