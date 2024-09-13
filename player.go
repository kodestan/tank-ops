package main

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/gorilla/websocket"
)

type PlayerMessageType int

const (
	PlayerSendTurn PlayerMessageType = 1
	PlayerQuitRoom PlayerMessageType = 2
)

type RoomChans struct {
	// player reads, room writes
	read chan RoomMessage
	// room reads, player writes
	send chan PlayerMessage
}

type PlayerMessage struct {
	msgType     PlayerMessageType
	roomCode    string
	tankActions []TankAction
	chans       RoomChans
}

type Player struct {
	notInRoom      PlayerStateNotInRoom
	waitingForRoom PlayerStateWaitingForRoom
	inRoom         PlayerStateInRoom
	waitForClose   PlayerStateWaitForClose
	state          PlayerState

	conn     *websocket.Conn
	wsClosed bool

	roomRequests chan RoomRequest
	clientRead   chan ClientMessage
	room         RoomChans

	done chan struct{}
}

func NewPlayer(conn *websocket.Conn, roomRequests chan RoomRequest) *Player {
	p := &Player{
		conn:         conn,
		roomRequests: roomRequests,
		clientRead:   make(chan ClientMessage),
	}
	p.notInRoom = PlayerStateNotInRoom{p}
	p.waitingForRoom = PlayerStateWaitingForRoom{p}
	p.inRoom = PlayerStateInRoom{p}
	p.waitForClose = PlayerStateWaitForClose{p}
	p.setState(p.notInRoom)

	return p
}

func (p *Player) Run() {
	go p.readPump()
	defer fmt.Println("player goroutine exited")
	for {
		select {
		case cm, ok := <-p.clientRead:
			if p.state.handleClientMessage(cm, ok) {
				return
			}
		case rm, ok := <-p.room.read:
			if p.state.handleRoomMessage(rm, ok) {
				return
			}
		}
	}
}

func (p *Player) setState(state PlayerState) {
	p.state = state
}

func (p *Player) Write(msg ServerMessage) error {
	if p.wsClosed {
		return errors.New("conn closed")
	}
	err := p.conn.WriteJSON(msg)
	if err != nil {
		p.wsClosed = true
		p.conn.Close()
		return err
	}
	return nil
}

func (p *Player) readPump() {
	defer func() {
		p.conn.Close()
		close(p.clientRead)
	}()

	for {
		msgType, msg, err := p.conn.ReadMessage()
		if err != nil {
			return
		}
		if msgType != websocket.TextMessage {
			return
		}

		clientMsg := ClientMessage{}
		err = json.Unmarshal(msg, &clientMsg)
		if err != nil {
			return
		}

		p.clientRead <- clientMsg
	}
}

type PlayerState interface {
	handleClientMessage(cm ClientMessage, ok bool) bool
	handleRoomMessage(rm RoomMessage, ok bool) bool
}

type PlayerStateNotInRoom struct {
	player *Player
}

func (ps PlayerStateNotInRoom) handleClientMessage(cm ClientMessage, ok bool) bool {
	if !ok {
		ps.player.clientRead = nil
		return true
	}
	switch cm.Type {
	case ClientJoinRoom:
		chans := RoomChans{
			read: make(chan RoomMessage),
			send: make(chan PlayerMessage),
		}
		ps.player.room = chans
		ps.player.done = make(chan struct{})

		go func(chans RoomChans) {
			ps.player.roomRequests <- RoomRequest{
				code:  cm.RoomCode,
				chans: chans,
			}
		}(chans)

		ps.player.setState(ps.player.waitingForRoom)
	case ClientQuitRoom:
		fmt.Println("illegal")
	case ClientSendTurn:
		fmt.Println("illegal")
	}
	return false
}

func (ps PlayerStateNotInRoom) handleRoomMessage(rm RoomMessage, ok bool) bool {
	panic("shouldnt receive from room while in PlayerStateNotInRoom")
}

type PlayerStateWaitingForRoom struct {
	player *Player
}

func (ps PlayerStateWaitingForRoom) handleClientMessage(cm ClientMessage, ok bool) bool {
	if !ok {
		ps.player.clientRead = nil
		ch := ps.player.room.send
		done := ps.player.done
		go func(ch chan PlayerMessage, done chan struct{}) {
			select {
			case ch <- PlayerMessage{msgType: PlayerQuitRoom}:
			case <-done:
			}
		}(ch, done)
		ps.player.setState(ps.player.waitForClose)
		return false
	}
	switch cm.Type {
	case ClientJoinRoom:
		fmt.Println("illegal")
	case ClientQuitRoom:
		ch := ps.player.room.send
		done := ps.player.done
		go func(ch chan PlayerMessage, done chan struct{}) {
			select {
			case ch <- PlayerMessage{msgType: PlayerQuitRoom}:
			case <-done:
			}
		}(ch, done)
	case ClientSendTurn:
		fmt.Println("illegal")
	}
	return false
}

func (ps PlayerStateWaitingForRoom) handleRoomMessage(rm RoomMessage, ok bool) bool {
	if !ok {
		close(ps.player.done)
		ps.player.done = nil
		ps.player.room.read = nil
		ps.player.room.send = nil
		ps.player.setState(ps.player.notInRoom)
		err := ps.player.Write(newRoomDisconnectedMessage())
		if err != nil {
			return true
		}
		return false
	}

	switch rm.msgType {
	case RoomJoined:
		ps.player.setState(ps.player.inRoom)
		err := ps.player.Write(newRoomJoinedMessage())
		if err != nil {
			ch := ps.player.room.send
			done := ps.player.done
			go func(ch chan PlayerMessage, done chan struct{}) {
				select {
				case ch <- PlayerMessage{msgType: PlayerQuitRoom}:
				case <-done:
				}
			}(ch, done)
			ps.player.setState(ps.player.waitForClose)
			return false
		}
	case RoomGameStarted:
		panic("game shouldnt start before joining room")
	case RoomTurnResult:
		panic("shouldnt rececive turn result before joining room")
	case RoomGameFinished:
		panic("shouldnt rececive game finished before joining room")
	}
	return false
}

type PlayerStateInRoom struct {
	player *Player
}

func (ps PlayerStateInRoom) handleClientMessage(cm ClientMessage, ok bool) bool {
	if !ok {
		ps.player.clientRead = nil
		ch := ps.player.room.send
		done := ps.player.done
		go func(ch chan PlayerMessage, done chan struct{}) {
			select {
			case ch <- PlayerMessage{msgType: PlayerQuitRoom}:
			case <-done:
			}
		}(ch, done)
		ps.player.setState(ps.player.waitForClose)
		return false
	}
	switch cm.Type {
	case ClientJoinRoom:
		fmt.Println("illegal")
	case ClientQuitRoom:
		ch := ps.player.room.send
		done := ps.player.done
		go func(ch chan PlayerMessage, done chan struct{}) {
			select {
			case ch <- PlayerMessage{msgType: PlayerQuitRoom}:
			case <-done:
			}
		}(ch, done)
	case ClientSendTurn:
		ch := ps.player.room.send
		done := ps.player.done
		go func(ch chan PlayerMessage, done chan struct{}) {
			msg := PlayerMessage{
				msgType:     PlayerSendTurn,
				tankActions: cm.Actions,
			}
			select {
			case ch <- msg:
			case <-done:
			}
		}(ch, done)
	}
	return false
}

func (ps PlayerStateInRoom) handleRoomMessage(rm RoomMessage, ok bool) bool {
	if !ok {
		close(ps.player.done)
		ps.player.done = nil
		ps.player.room.read = nil
		ps.player.room.send = nil

		err := ps.player.Write(newRoomDisconnectedMessage())
		if err != nil {
			ps.player.conn.Close()
			return true
		}
		ps.player.setState(ps.player.notInRoom)
		return false
	}

	var err error

	switch rm.msgType {
	case RoomJoined:
		panic("shouldnt receive room joined message while in room")
	case RoomGameStarted:
		err = ps.player.Write(newStartGameMessage(rm.config))
	case RoomTurnResult:
		err = ps.player.Write(newTurnResultsMessage(rm.turnResults))
	case RoomGameFinished:
		err = ps.player.Write(newGameFinishedMessage(rm.gameResult))
	}

	if err != nil {
		ch := ps.player.room.send
		done := ps.player.done
		go func(ch chan PlayerMessage, done chan struct{}) {
			select {
			case ch <- PlayerMessage{msgType: PlayerQuitRoom}:
			case <-done:
			}
		}(ch, done)
		ps.player.setState(ps.player.waitForClose)
	}
	return false
}

type PlayerStateWaitForClose struct {
	player *Player
}

func (ps PlayerStateWaitForClose) handleClientMessage(cm ClientMessage, ok bool) bool {
	if ok {
		return false
	}
	ps.player.clientRead = nil
	if ps.player.room.read == nil {
		return true
	}
	return false
}

func (ps PlayerStateWaitForClose) handleRoomMessage(rm RoomMessage, ok bool) bool {
	if ok {
		return false
	}
	ps.player.room.read = nil
	close(ps.player.done)
	if ps.player.clientRead == nil {
		return true
	}
	return false
}
