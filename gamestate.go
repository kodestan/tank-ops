package main

type TankActionType int

const (
	TankMove TankActionType = 1
	TankFire TankActionType = 2
)

type TankAction struct {
	Type TankActionType `json:"type"`
	Id   int            `json:"id"`
	Dir  Vector         `json:"dir"`
	Path []Vector       `json:"path"`
}

type Tank struct {
	id        int
	p         Vector
	exercised bool
	visible   bool
	disabled  bool
}

type Hex struct {
	p           Vector
	traversable bool
}

//	export enum TurnResultType {
//	  Move2 = 1,
//	  Move3 = 2,
//	  Fire = 3,
//	  Explosion = 4,
//	  Destroyed = 5,
//	  Visible = 6,
//	}
type TurnResultType int

const (
	Move2     TurnResultType = 1
	Move3     TurnResultType = 2
	Fire      TurnResultType = 3
	Explosion TurnResultType = 4
	Destroyed TurnResultType = 5
	Visible   TurnResultType = 6
)

//	type TurnResultMove2 = {
//	  type: TurnResultType.Move2;
//	  id: number;
//	  p1: Vector;
//	  p2: Vector;
//	  start: boolean;
//	};
type TurnResultMove2 struct {
	Type  TurnResultType `json:"type"`
	Id    int            `json:"id"`
	P1    Vector         `json:"p1"`
	P2    Vector         `json:"p2"`
	Start bool           `json:"start"`
}

func (tr TurnResultMove2) isTurnResult() {}
func newTurnResultMove2(id int, p1, p2 Vector, start bool) TurnResultMove2 {
	return TurnResultMove2{Type: Move2, Id: id, P1: p1, P2: p2, Start: start}
}

//	type TurnResultMove3 = {
//	  type: TurnResultType.Move3;
//	  id: number;
//	  p1: Vector;
//	  p2: Vector;
//	  p3: Vector;
//	};
type TurnResultMove3 struct {
	Type TurnResultType `json:"type"`
	Id   int            `json:"id"`
	P1   Vector         `json:"p1"`
	P2   Vector         `json:"p2"`
	P3   Vector         `json:"p3"`
}

func (tr TurnResultMove3) isTurnResult() {}
func newTurnResultMove3(id int, p1, p2, p3 Vector) TurnResultMove3 {
	return TurnResultMove3{Type: Move3, Id: id, P1: p1, P2: p2, P3: p3}
}

//
// export type TurnResultFire = {
//   type: TurnResultType.Fire;
//   id: number;
//   dir: Vector;
// };
//
// export type TurnResultExplosion = {
//   type: TurnResultType.Explosion;
//   p: Vector;
//   destroyed: boolean;
//   id: number;
// };
//
// export type TurnResultDestroyed = {
//   type: TurnResultType.Destroyed;
//   p: Vector;
//   id: number;
// };
//
// export type TurnResultVisible = {
//   type: TurnResultType.Visible;
//   p: Vector;
//   id: number;
// };

type TurnResult interface {
	isTurnResult()
}

type GameState struct {
	cfg ClientConfig

	playerTanks map[int]*Tank
	enemyTanks  map[int]*Tank
	hexes       map[Vector]*Hex
}

func newGameState(cfg ClientConfig) *GameState {
	hexes := make(map[Vector]*Hex)
	playerTanks := make(map[int]*Tank)
	enemyTanks := make(map[int]*Tank)

	for _, hexCfg := range cfg.Hexes {
		hexes[hexCfg.P] = &Hex{hexCfg.P, true}
	}
	for _, site := range cfg.Sites {
		hex, ok := hexes[site.P]
		if !ok {
			continue
		}
		hex.traversable = false
	}

	for _, pt := range cfg.PlayerTanks {
		playerTanks[pt.Id] = &Tank{id: pt.Id, p: pt.P}
	}

	for _, et := range cfg.EnemyTanks {
		enemyTanks[et.Id] = &Tank{id: et.Id, p: et.P}
	}

	return &GameState{
		cfg:         cfg,
		playerTanks: playerTanks,
		enemyTanks:  enemyTanks,
		hexes:       hexes,
	}
}

func (gs *GameState) resolveActions(actions []TankAction) []TurnResult {
	turnResults := make([]TurnResult, 0)

	for _, action := range actions {
		tank, ok := gs.playerTanks[action.Id]
		if !ok || tank.exercised || tank.disabled {
			continue
		}
		tank.exercised = true

		switch action.Type {
		case TankMove:
			validPath := gs.validPath(action.Path, tank)
			if len(validPath) < 2 {
				break
			}
			startResult := newTurnResultMove2(
				tank.id, validPath[0], validPath[1], true,
			)
			turnResults = append(turnResults, startResult)

			for i := 0; i < len(validPath)-2; i++ {
				p1, p2, p3 := validPath[i], validPath[i+1], validPath[i+2]
				midResult := newTurnResultMove3(
					tank.id,
					p1,
					p2,
					p3,
				)
				turnResults = append(turnResults, midResult)
				tank.p = p2
			}

			iLast := len(validPath) - 1
			endResult := newTurnResultMove2(
				tank.id, validPath[iLast-1], validPath[iLast], false,
			)
			turnResults = append(turnResults, endResult)
			tank.p = validPath[iLast]
		}
	}

	for _, tank := range gs.playerTanks {
		tank.exercised = false
	}

	return turnResults
}

func (gs *GameState) validPath(path []Vector, tank *Tank) []Vector {
	validPath := make([]Vector, 0)
	if len(path) < 2 || len(path) > gs.cfg.DriveRange+1 || tank.p != path[0] {
		return validPath
	}

	for i := 1; i < len(path); i++ {
		if !gs.isTraversable(path[i]) {
			break
		}

		if i == 1 {
			validPath = append(validPath, path[0])
		}
		validPath = append(validPath, path[i])
	}
	return validPath
}

func (gs *GameState) isTraversable(p Vector) bool {
	hex, ok := gs.hexes[p]
	if !ok || !hex.traversable {
		return false
	}
	for _, tank := range gs.playerTanks {
		if p == tank.p {
			return false
		}
	}

	for _, tank := range gs.enemyTanks {
		if p == tank.p {
			return false
		}
	}

	return true
}
