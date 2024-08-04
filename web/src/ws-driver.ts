import { GameEventType } from "./game-event.js";
import {
  GameConfig,
  GameResult,
  TankAction,
  TurnResult,
} from "./game-objects.js";
import { Notifier } from "./notifier.js";
import { Vector } from "./vector.js";

function vectorReviver(key: string, value: any) {
  if (typeof value === "object" && "x" in value && "y" in value) {
    return new Vector(value.x, value.y);
  }
  return value;
}

// ServerStartGame        ServerMessageType = 1
// Type   ServerMessageType `json:"type"`
// Config ClientConfig      `json:"config"`
// ServerTurnResults      ServerMessageType = 2
// Type        ServerMessageType `json:"type"`
// TurnResults []TurnResult      `json:"turnResults"`
// ServerRoomJoined       ServerMessageType = 3
// Type ServerMessageType `json:"type"`
// ServerRoomDisconnected ServerMessageType = 4
// Type ServerMessageType `json:"type"`
// ServerGameFinished     ServerMessageType = 5
// Type   ServerMessageType `json:"type"`
// Result GameResult        `json:"result"`

enum ServerMessageType {
  StartGame = 1,
  TurnResults = 2,
  RoomJoined = 3,
  RoomDisconnected = 4,
  GameFinished = 5,
}

type ServerMessage =
  | {
      type: ServerMessageType.StartGame;
      config: GameConfig;
    }
  | {
      type: ServerMessageType.TurnResults;
      turnResults: TurnResult[];
    }
  | {
      type: ServerMessageType.RoomJoined;
    }
  | {
      type: ServerMessageType.RoomDisconnected;
    }
  | {
      type: ServerMessageType.GameFinished;
      result: GameResult;
    };

enum ClientMessageType {
  JoinRoom = 1,
  SendTurn = 2,
  QuitRoom = 3,
}

type ClientMessage =
  | {
      type: ClientMessageType.JoinRoom;
      roomCode: string;
    }
  | {
      type: ClientMessageType.SendTurn;
      actions: TankAction[];
    };

export class WsDriver {
  open: boolean = false;
  conn: WebSocket;
  notifier: Notifier;

  constructor(url: string, notifier: Notifier) {
    this.notifier = notifier;
    this.conn = new WebSocket(url);
    this.conn.onopen = () => this.handleOpen();
    this.conn.onclose = () => this.handleClose();
    this.conn.onmessage = (e) => this.handleMessage(e);
  }

  private send(msg: ClientMessage) {
    if (!this.open) {
      return;
    }
    this.conn.send(JSON.stringify(msg));
  }

  public sendStartGame(code: string) {
    const msg: ClientMessage = {
      type: ClientMessageType.JoinRoom,
      roomCode: code,
    };
    this.send(msg);
  }

  public sendActions(actions: TankAction[]) {
    const msg: ClientMessage = {
      type: ClientMessageType.SendTurn,
      actions: actions,
    };
    this.send(msg);
  }

  private handleOpen() {
    this.open = true;
    this.notifier.notify({ type: GameEventType.WsOpen });
  }

  private handleClose() {
    this.open = false;
    this.notifier.notify({ type: GameEventType.WsClose });
  }

  private handleMessage(e: MessageEvent) {
    const msg = JSON.parse(e.data, vectorReviver) as ServerMessage;
    switch (msg.type) {
      case ServerMessageType.StartGame:
        this.notifier.notify({
          type: GameEventType.StartGame,
          config: msg.config,
        });
        break;
      case ServerMessageType.TurnResults:
        this.notifier.notify({
          type: GameEventType.ReceiveTurnResults,
          turnResults: msg.turnResults,
        });
        break;
      case ServerMessageType.RoomJoined:
        this.notifier.notify({
          type: GameEventType.RoomJoined,
        });
        break;
      case ServerMessageType.RoomDisconnected:
        this.notifier.notify({
          type: GameEventType.RoomDisconnected,
        });
        break;
      case ServerMessageType.GameFinished:
        this.notifier.notify({
          type: GameEventType.GameFinished,
          result: msg.result,
        });
        break;
    }
  }
}
