export enum GameEventType {
  ZoomIn,
  ZoomOut,
  StartGame,
  SendTurn,
}

export type GameEvent = {
  type: GameEventType;
};
