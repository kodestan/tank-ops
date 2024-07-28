package main

type ServerMessageType int

const (
	StartGame   ServerMessageType = 1
	TurnResults ServerMessageType = 2
)

type StartGameMessage struct {
	Type   ServerMessageType `json:"type"`
	Config ClientConfig      `json:"config"`
}

type TurnResultsMessage struct {
	Type        ServerMessageType `json:"type"`
	TurnResults []TurnResult      `json:"turnResults"`
}

func newStartGameMessage(config ClientConfig) StartGameMessage {
	return StartGameMessage{StartGame, config}
}

func newTurnResultsMessage(results []TurnResult) TurnResultsMessage {
	return TurnResultsMessage{TurnResults, results}
}

type ClientMessageType int

const (
	ClientStartGame ClientMessageType = 1
	ClientSendTurn  ClientMessageType = 2
)

type ClientMessage struct {
	Type    ClientMessageType `json:"type"`
	Actions []TankAction      `json:"Actions"`
}
