package main

// export type GameConfig = {
//   hexes: { p: Vector; variant: number }[];
//   playerTanks: { id: number; p: Vector }[];
//   enemyTanks: { id: number; p: Vector }[];
//   sites: { p: Vector; variant: number }[];
// };

type TankConfig struct {
	Id int    `json:"id"`
	P  Vector `json:"p"`
}

type SceneConfig struct {
	P       Vector `json:"p"`
	Variant int    `json:"variant"`
}

type ClientConfig struct {
	PlayerTanks     []TankConfig  `json:"playerTanks"`
	EnemyTanks      []TankConfig  `json:"enemyTanks"`
	Hexes           []SceneConfig `json:"hexes"`
	Sites           []SceneConfig `json:"sites"`
	DriveRange      int           `json:"driveRange"`
	VisibilityRange int           `json:"visibilityRange"`
	FireRange       int           `json:"fireRange"`
}

type GameConfig struct {
	tanksP1         []TankConfig
	tanksP2         []TankConfig
	hexes           []SceneConfig
	sites           []SceneConfig
	driveRange      int
	visibilityRange int
	fireRange       int
	p1First         bool
}

func (gc GameConfig) ClientConfigs() (ClientConfig, ClientConfig) {
	p1 := ClientConfig{
		gc.tanksP1,
		gc.tanksP2,
		gc.hexes,
		gc.sites,
		gc.driveRange,
		gc.visibilityRange,
		gc.fireRange,
	}
	p2 := ClientConfig{
		gc.tanksP2,
		gc.tanksP1,
		gc.hexes,
		gc.sites,
		gc.driveRange,
		gc.visibilityRange,
		gc.fireRange,
	}
	return p1, p2
}

func NewBasicConfig(swapPlayers, p1First bool) GameConfig {
	tanksP1 := []TankConfig{
		{1, Vector{0, 0}},
		{2, Vector{2, -2}},
		// {3, Vector{3, 0}},
		{4, Vector{-2, -1}},
	}
	tanksP2 := []TankConfig{
		// {8, Vector{2, 2}},
		{9, Vector{0, 1}},
		// {10, Vector{1, 1}},
	}
	return GameConfig{
		tanksP1: tanksP1,
		tanksP2: tanksP2,
		hexes: []SceneConfig{
			{Vector{1, -2}, 2},
			{Vector{2, -2}, 1},
			{Vector{-2, -1}, 2},
			{Vector{-1, -1}, 2},
			{Vector{0, -1}, 2},
			{Vector{-2, 0}, 0},
			{Vector{0, 0}, 0},
			{Vector{1, 0}, 1},
			// {Vector{2, 0}, 2},
			// {Vector{3, 0}, 0},
			{Vector{-2, 1}, 0},
			{Vector{-1, 1}, 0},
			{Vector{0, 1}, 0},
			{Vector{1, 1}, 1},
			// {Vector{2, 1}, 2},
			{Vector{-2, 2}, 0},
			{Vector{-1, 2}, 0},
			// {Vector{1, 2}, 2},
			// {Vector{2, 2}, 1},
		},
		sites: []SceneConfig{
			{Vector{1, 0}, 8},
			// {Vector{2, 1}, 6},
			{Vector{-1, 2}, 6},
		},
		driveRange:      6,
		visibilityRange: 2,
		fireRange:       3,
		p1First:         p1First,
	}
}
