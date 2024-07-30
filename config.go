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

var basicConfig = ClientConfig{
	PlayerTanks: []TankConfig{
		{1, Vector{0, 0}},
		{2, Vector{2, -2}},
		// {3, Vector{3, 0}},
		{4, Vector{-2, -1}},
	},
	EnemyTanks: []TankConfig{
		// {8, Vector{2, 2}},
		{9, Vector{0, 1}},
		// {10, Vector{1, 1}},
	},
	Hexes: []SceneConfig{
		{Vector{0, -10}, 0},
		{Vector{1, -10}, 0},
		{Vector{2, -10}, 0},
		{Vector{3, -10}, 0},
		{Vector{4, -10}, 0},
		{Vector{5, -10}, 0},
		{Vector{6, -10}, 0},
		{Vector{7, -10}, 0},
		{Vector{8, -10}, 0},
		{Vector{9, -10}, 0},

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
	Sites: []SceneConfig{
		{Vector{0, -10}, 0},
		{Vector{1, -10}, 1},
		{Vector{2, -10}, 2},
		{Vector{3, -10}, 3},
		{Vector{4, -10}, 4},
		{Vector{5, -10}, 5},
		{Vector{6, -10}, 6},
		{Vector{7, -10}, 7},
		{Vector{8, -10}, 8},
		// {Vector{9, -10}, 9},

		{Vector{1, 0}, 8},
		// {Vector{2, 1}, 6},
		{Vector{-1, 2}, 6},
	},
	DriveRange:      3,
	VisibilityRange: 10,
	FireRange:       2,
}
