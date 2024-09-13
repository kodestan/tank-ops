package main

import "fmt"

type RoomMessageType int

const (
	RoomJoined       RoomMessageType = 1
	RoomGameStarted  RoomMessageType = 2
	RoomGameFinished RoomMessageType = 3
	RoomTurnResult   RoomMessageType = 4
)

type RoomMessage struct {
	msgType     RoomMessageType
	config      ClientConfig
	turnResults []TurnResult
	gameResult  GameResult
}

type QueuedActions struct {
	actions []TankAction
	queued  bool
}

type Room struct {
	waitingForP1 RoomStateWaitingForP1
	waitingForP2 RoomStateWaitingForP2
	running      RoomStateRunning
	closing      RoomStateClosing
	state        RoomState

	code     string
	requests chan RoomRequest
	close    chan string

	player1chans RoomChans
	player2chans RoomChans

	gamestate *GameState

	queuedP1 QueuedActions
	queuedP2 QueuedActions
}

func NewRoom(code string, close chan string) *Room {
	requests := make(chan RoomRequest)
	room := &Room{
		code:     code,
		requests: requests,
		close:    close,
	}
	room.waitingForP1 = RoomStateWaitingForP1{room}
	room.waitingForP2 = RoomStateWaitingForP2{room}
	room.running = RoomStateRunning{room}
	room.state = room.waitingForP1
	return room
}

func (r *Room) Run() {
	for {
		select {
		case joinRequest, ok := <-r.requests:
			if r.state.handleJoinRequest(joinRequest, ok) {
				return
			}
		case msg := <-r.player1chans.send:
			r.state.handlePlayerMessage(msg, true)
		case msg := <-r.player2chans.send:
			r.state.handlePlayerMessage(msg, false)
		}
	}
}

func (r *Room) setState(state RoomState) {
	r.state = state
}

func (r *Room) QueueActions(actions []TankAction, p1 bool) bool {
	if p1 {
		r.queuedP1.queued = true
		r.queuedP1.actions = actions
	} else {
		r.queuedP2.queued = true
		r.queuedP2.actions = actions
	}
	if r.queuedP1.queued && r.queuedP2.queued {
		return true
	}
	return false
}

func (r *Room) ClearActions() {
	r.queuedP1.queued = false
	r.queuedP1.actions = []TankAction{}
	r.queuedP2.queued = false
	r.queuedP2.actions = []TankAction{}
}

func (r *Room) Actions() ([]TankAction, []TankAction) {
	return r.queuedP1.actions, r.queuedP2.actions
}

type RoomState interface {
	handleJoinRequest(req RoomRequest, ok bool) bool
	handlePlayerMessage(msg PlayerMessage, isP1 bool)
}

type RoomStateWaitingForP1 struct {
	r *Room
}

func (s RoomStateWaitingForP1) handleJoinRequest(req RoomRequest, ok bool) bool {
	if !ok {
		panic("shouldnt require closing in waiting state")
	}

	s.r.player1chans = req.chans
	s.r.player1chans.read <- RoomMessage{msgType: RoomJoined}
	s.r.setState(s.r.waitingForP2)
	return false
}

func (s RoomStateWaitingForP1) handlePlayerMessage(msg PlayerMessage, isP1 bool) {
	panic("shouldnt receive player message while in waiting state")
}

type RoomStateWaitingForP2 struct {
	r *Room
}

func (s RoomStateWaitingForP2) handleJoinRequest(req RoomRequest, ok bool) bool {
	if !ok {
		panic("shouldnt require closing in waiting state")
	}

	s.r.player2chans = req.chans
	s.r.player2chans.read <- RoomMessage{msgType: RoomJoined}

	s.r.gamestate = NewGameState(NewBasicConfig(false, true))
	cfg1, cfg2 := s.r.gamestate.ClientConfigs()

	s.r.player1chans.read <- RoomMessage{msgType: RoomGameStarted, config: cfg1}
	s.r.player2chans.read <- RoomMessage{msgType: RoomGameStarted, config: cfg2}

	s.r.setState(s.r.running)
	return false
}

func (s RoomStateWaitingForP2) handlePlayerMessage(msg PlayerMessage, isP1 bool) {
	if !isP1 {
		panic("shouldnt receive message from p2 before him joining")
	}
	switch msg.msgType {
	case PlayerQuitRoom:
		close(s.r.player1chans.read)
		s.r.player1chans.send = nil

		ch := s.r.close
		go func(ch chan string) {
			ch <- s.r.code
		}(ch)

		s.r.setState(s.r.closing)
	case PlayerSendTurn:
		fmt.Println("illegal")
	}
}

type RoomStateRunning struct {
	r *Room
}

func (s RoomStateRunning) handleJoinRequest(req RoomRequest, ok bool) bool {
	if !ok {
		panic("shouldnt require closing in waiting state")
	}
	close(req.chans.read)
	return false
}

func (s RoomStateRunning) handlePlayerMessage(msg PlayerMessage, isP1 bool) {
	switch msg.msgType {
	case PlayerQuitRoom:
		res1, res2 := Win, Win
		if isP1 {
			res1 = Lose
		} else {
			res2 = Lose
		}
		s.r.player1chans.read <- RoomMessage{msgType: RoomGameFinished, gameResult: res1}
		s.r.player2chans.read <- RoomMessage{msgType: RoomGameFinished, gameResult: res2}
		close(s.r.player1chans.read)
		close(s.r.player2chans.read)
		s.r.player1chans.send = nil
		s.r.player2chans.send = nil

		ch := s.r.close
		go func(ch chan string) {
			ch <- s.r.code
		}(ch)

		s.r.setState(s.r.closing)

	case PlayerSendTurn:
		if s.r.QueueActions(msg.tankActions, isP1) {
			p1, p2 := s.r.Actions()
			s.r.ClearActions()
			fmt.Println("queued", p1, p2)

			results1, results2 := s.r.gamestate.ResolveActions(p1, p2)

			s.r.player1chans.read <- RoomMessage{
				msgType:     RoomTurnResult,
				turnResults: results1,
			}
			s.r.player2chans.read <- RoomMessage{
				msgType:     RoomTurnResult,
				turnResults: results2,
			}

			gameResultP1, gameResultP2, ok := s.r.gamestate.Result()
			if !ok {
				return
			}

			s.r.player1chans.read <- RoomMessage{
				msgType:    RoomGameFinished,
				gameResult: gameResultP1,
			}
			s.r.player2chans.read <- RoomMessage{
				msgType:    RoomGameFinished,
				gameResult: gameResultP2,
			}

			close(s.r.player1chans.read)
			close(s.r.player2chans.read)
			s.r.player1chans.send = nil
			s.r.player2chans.send = nil

			ch := s.r.close
			go func(ch chan string) {
				ch <- s.r.code
			}(ch)

			s.r.setState(s.r.closing)
		}
	}
}

type RoomStateClosing struct {
	r *Room
}

func (s RoomStateClosing) handleJoinRequest(req RoomRequest, ok bool) bool {
	if !ok {
		return true

	}
	close(req.chans.read)
	return false
}

func (s RoomStateClosing) handlePlayerMessage(msg PlayerMessage, isP1 bool) {
}
