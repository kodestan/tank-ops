package main

type ServerMessageType int

const (
	ServerStartGame        ServerMessageType = 1
	ServerTurnResults      ServerMessageType = 2
	ServerRoomJoined       ServerMessageType = 3
	ServerRoomDisconnected ServerMessageType = 4
	ServerGameFinished     ServerMessageType = 5
)

type ServerMessage interface {
	isServerMessage()
}

type StartGameMessage struct {
	Type   ServerMessageType `json:"type"`
	Config ClientConfig      `json:"config"`
}

func (m StartGameMessage) isServerMessage() {}

type TurnResultsMessage struct {
	Type        ServerMessageType `json:"type"`
	TurnResults []TurnResult      `json:"turnResults"`
}

func (m TurnResultsMessage) isServerMessage() {}

type RoomJoinedMessage struct {
	Type ServerMessageType `json:"type"`
}

func (m RoomJoinedMessage) isServerMessage() {}

type RoomDisconnectedMessage struct {
	Type ServerMessageType `json:"type"`
}

func (m RoomDisconnectedMessage) isServerMessage() {}

type GameFinishedMessage struct {
	Type   ServerMessageType `json:"type"`
	Result GameResult        `json:"result"`
}

func (m GameFinishedMessage) isServerMessage() {}

func newStartGameMessage(config ClientConfig) StartGameMessage {
	return StartGameMessage{ServerStartGame, config}
}

func newTurnResultsMessage(results []TurnResult) TurnResultsMessage {
	return TurnResultsMessage{ServerTurnResults, results}
}

func newRoomJoinedMessage() RoomJoinedMessage {
	return RoomJoinedMessage{ServerRoomJoined}
}

func newRoomDisconnectedMessage() RoomDisconnectedMessage {
	return RoomDisconnectedMessage{ServerRoomDisconnected}
}

// TODO add result
func newGameFinishedMessage(result GameResult) GameFinishedMessage {
	return GameFinishedMessage{ServerGameFinished, result}
}

type ClientMessageType int

const (
	ClientJoinRoom ClientMessageType = 1
	ClientSendTurn ClientMessageType = 2
	ClientQuitRoom ClientMessageType = 3
)

type ClientMessage struct {
	Type     ClientMessageType `json:"type"`
	Actions  []TankAction      `json:"Actions"`
	RoomCode string            `json:"roomCode"`
}
