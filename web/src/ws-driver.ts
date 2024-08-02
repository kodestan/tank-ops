import { GameEventType } from "./game-event.js";
import { GameConfig, TankAction, TurnResult } from "./game-objects.js";
import { Notifier } from "./notifier.js";
import { Vector } from "./vector.js";

function vectorReviver(key: string, value: any) {
  if (typeof value === "object" && "x" in value && "y" in value) {
    return new Vector(value.x, value.y);
  }
  return value;
}

enum ServerMessageType {
  JoinRoom = 1,
  TurnResults = 2,
}

type ServerMessage =
  | {
      type: ServerMessageType.JoinRoom;
      config: GameConfig;
    }
  | {
      type: ServerMessageType.TurnResults;
      turnResults: TurnResult[];
    };

enum ClientMessageType {
  StartGame = 1,
  SendTurn = 2,
}

type ClientMessage =
  | {
      type: ClientMessageType.StartGame;
      roomCode: string;
    }
  | {
      type: ClientMessageType.SendTurn;
      actions: TankAction[];
    };

export class WsDriver {
  conn: WebSocket;
  notifier: Notifier;

  constructor(url: string, notifier: Notifier) {
    this.notifier = notifier;
    this.conn = new WebSocket(url);
    this.conn.onopen = () => this.handleOpen();
    this.conn.onclose = () => this.handleClose();
    this.conn.onmessage = (e) => this.handleMessage(e);
  }

  public sendStartGame(code: string) {
    const msg: ClientMessage = {
      type: ClientMessageType.StartGame,
      roomCode: code,
    };
    this.conn.send(JSON.stringify(msg));
  }

  public sendActions(actions: TankAction[]) {
    const msg: ClientMessage = {
      type: ClientMessageType.SendTurn,
      actions: actions,
    };
    this.conn.send(JSON.stringify(msg));
  }

  private handleOpen() {
    this.notifier.notify({ type: GameEventType.WsOpen });
  }

  private handleClose() {
    this.notifier.notify({ type: GameEventType.WsClose });
  }

  private handleMessage(e: MessageEvent) {
    const msg = JSON.parse(e.data, vectorReviver) as ServerMessage;
    switch (msg.type) {
      case ServerMessageType.JoinRoom:
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
    }
  }
}
