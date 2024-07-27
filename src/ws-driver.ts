import { GameEventType } from "./game-event.js";
import { GameConfig } from "./game-objects.js";
import { Notifier } from "./notifier.js";
import { Vector } from "./vector.js";

function vectorReviver(key: string, value: any) {
  if (typeof value === "object" && "x" in value && "y" in value) {
    return new Vector(value.x, value.y);
  }
  return value;
}

enum ServerMessageType {
  StartGame = 1,
}

type ServerMessage = {
  type: ServerMessageType.StartGame;
  config: GameConfig;
};

enum ClientMessageType {
  StartGame = 1,
}

type ClientMessage = {
  type: ClientMessageType;
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

  public sendStartGame() {
    const msg: ClientMessage = { type: ClientMessageType.StartGame };
    this.conn.send(JSON.stringify(msg));
  }

  private handleOpen() {
    console.log("opened");
    this.notifier.notify({ type: GameEventType.WsOpen });
  }

  private handleClose() {
    console.log("opened");
    this.notifier.notify({ type: GameEventType.WsClose });
  }

  private handleMessage(e: MessageEvent) {
    console.log("recv message", e.data);
    const msg = JSON.parse(e.data, vectorReviver) as ServerMessage;
    if (msg.type === ServerMessageType.StartGame) {
      console.log(msg.config.playerTanks);
      this.notifier.notify({
        type: GameEventType.StartGame,
        config: msg.config,
      });
    }
  }
}
