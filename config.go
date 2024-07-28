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
		{3, Vector{3, 0}},
		{4, Vector{-2, 0}},
	},
	EnemyTanks: []TankConfig{
		{8, Vector{2, 2}},
		{9, Vector{0, 1}},
		{10, Vector{1, 1}},
	},
	Hexes: []SceneConfig{
		{Vector{1, -2}, 2},
		{Vector{2, -2}, 1},
		{Vector{-2, -1}, 2},
		{Vector{-1, -1}, 2},
		{Vector{0, -1}, 2},
		{Vector{-2, 0}, 0},
		{Vector{0, 0}, 0},
		{Vector{1, 0}, 1},
		{Vector{2, 0}, 2},
		{Vector{3, 0}, 0},
		{Vector{-2, 1}, 0},
		{Vector{-1, 1}, 0},
		{Vector{0, 1}, 0},
		{Vector{1, 1}, 1},
		{Vector{2, 1}, 2},
		{Vector{1, 2}, 2},
		{Vector{2, 2}, 1},
	},
	Sites: []SceneConfig{
		{Vector{1, 0}, 5},
		{Vector{2, 1}, 6},
	},
	DriveRange:      4,
	VisibilityRange: 1,
	FireRange:       2,
}
