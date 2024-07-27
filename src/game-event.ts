export enum GameEventType {
  ZoomIn,
  ZoomOut,
  StartGame,
  SendTurn,
  QuitGame,
}

export type GameEvent = {
  type: GameEventType;
};
