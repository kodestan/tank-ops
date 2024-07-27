package main

type ServerMessageType int

const (
	StartGame ServerMessageType = 1
)

type StartGameMessage struct {
	Type   ServerMessageType `json:"type"`
	Config ClientConfig      `json:"config"`
}

func newStartGameMessage(config ClientConfig) StartGameMessage {
	return StartGameMessage{StartGame, config}
}

type ClientMessageType int

const (
	ClientStartGame ClientMessageType = 1
)

type ClientMessage struct {
	Type ClientMessageType `json:"type"`
}
