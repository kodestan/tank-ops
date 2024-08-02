import { GameConfig, TurnResult } from "./game-objects";

export enum GameEventType {
  StartGame,
  ReceiveTurnResults,
  // type only
  NoneEvent,
  ButtonZoomIn,
  ButtonZoomOut,
  ButtonJoinRoom,
  ButtonSendTurn,
  ButtonQuitGame,
  WsOpen,
  WsClose,
}

export type TypeOnlyEvent =
  | GameEventType.NoneEvent
  | GameEventType.ButtonZoomIn
  | GameEventType.ButtonZoomOut
  | GameEventType.ButtonJoinRoom
  | GameEventType.ButtonSendTurn
  | GameEventType.ButtonQuitGame
  | GameEventType.WsOpen
  | GameEventType.WsClose;

export type GameEvent =
  | {
      type: TypeOnlyEvent;
    }
  | {
      type: GameEventType.StartGame;
      config: GameConfig;
    }
  | {
      type: GameEventType.ReceiveTurnResults;
      turnResults: TurnResult[];
    };
