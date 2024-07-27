import { GameConfig } from "./game-objects";

export enum GameEventType {
  StartGame,
  // type only
  ButtonZoomIn,
  ButtonZoomOut,
  ButtonStartGame,
  ButtonSendTurn,
  ButtonQuitGame,
  WsOpen,
  WsClose,
}

export type TypeOnlyEvent =
  | GameEventType.ButtonZoomIn
  | GameEventType.ButtonZoomOut
  | GameEventType.ButtonStartGame
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
    };
