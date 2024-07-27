package main

type Vector struct {
	X int `json:"x"`
	Y int `json:"y"`
}

func (v Vector) add(other Vector) Vector {
	return Vector{v.X + other.X, v.Y + other.Y}
}
