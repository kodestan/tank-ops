package main

func abs(val int) int {
	if val < 0 {
		return -val
	}
	return val
}

type Vector struct {
	X int `json:"x"`
	Y int `json:"y"`
}

func newZeroVector() Vector {
	return Vector{0, 0}
}

func (v Vector) add(other Vector) Vector {
	return Vector{v.X + other.X, v.Y + other.Y}
}

func (v Vector) sub(other Vector) Vector {
	return Vector{v.X - other.X, v.Y - other.Y}
}

func (v Vector) distance(other Vector) int {
	diff := v.sub(other)
	x := abs(diff.X)
	y := abs(diff.Y)
	xy := abs(diff.X + diff.Y)

	return max(x, y, xy)
}

func (v Vector) isUnit() bool {
	if v.distance(newZeroVector()) == 1 {
		return true
	}
	return false
}
