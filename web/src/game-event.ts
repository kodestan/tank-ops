import { GameConfig, GameResult, TurnResult } from "./game-objects.js";

export enum GameEventType {
  // ws events
  StartGame,
  ReceiveTurnResults,
  GameFinished,
  // ws type only
  WsOpen,
  WsClose,
  RoomJoined,
  RoomDisconnected,
  // type only
  NoneEvent,
  ButtonZoomIn,
  ButtonZoomOut,
  ButtonJoinRoom,
  ButtonSendTurn,
  ButtonQuitGame,
  ButtonUnmute,
  ButtonMute,
  AnimationEnd,
  TankManipulation,
  AudioLoadFail,
  AudioLoadSuccess,
}

export type TypeOnlyEvent =
  | GameEventType.NoneEvent
  | GameEventType.ButtonZoomIn
  | GameEventType.ButtonZoomOut
  | GameEventType.ButtonJoinRoom
  | GameEventType.ButtonSendTurn
  | GameEventType.ButtonQuitGame
  | GameEventType.ButtonUnmute
  | GameEventType.ButtonMute
  | GameEventType.WsOpen
  | GameEventType.WsClose
  | GameEventType.RoomJoined
  | GameEventType.RoomDisconnected
  | GameEventType.AnimationEnd
  | GameEventType.TankManipulation
  | GameEventType.AudioLoadSuccess
  | GameEventType.AudioLoadFail;

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
    }
  | {
      type: GameEventType.GameFinished;
      result: GameResult;
    };
