export class Vector {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  toString(): string {
    return `${this.x}_${this.y}`;
  }

  mul(multiplier: number): Vector {
    return new Vector(this.x * multiplier, this.y * multiplier);
  }

  add(other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  sub(other: Vector): Vector {
    return new Vector(this.x - other.x, this.y - other.y);
  }

  matmul(other: Vector): Vector {
    return new Vector(this.x * other.x, this.y * other.y);
  }

  round(): Vector {
    return new Vector(Math.round(this.x), Math.round(this.y));
  }

  floor(): Vector {
    return new Vector(Math.floor(this.x), Math.floor(this.y));
  }

  eq(other: Vector): boolean {
    return this.x === other.x && this.y === other.y;
  }
}

export function isNeighbor(p1: Vector, p2: Vector): boolean {
  if (!p1.eq(p1.floor())) return false;
  if (!p2.eq(p2.floor())) return false;
  if (p1.eq(p2)) return false;
  const v = p2.sub(p1);

  if (v.x <= 1 && v.x >= -1 && v.y === 0) return true;
  if (v.y <= 1 && v.y >= -1 && v.x === 0) return true;
  if ((v.x === 1 && v.y === -1) || (v.x === -1 && v.y === 1)) return true;
  return false;
}

export function includesVector(arr: Vector[], v: Vector) {
  for (const av of arr) {
    if (av.eq(v)) {
      return true;
    }
  }
  return false;
}

const idxToUnitVector: Map<number, Vector> = new Map([
  [0, new Vector(1, 0)],
  [1, new Vector(0, 1)],
  [2, new Vector(-1, 1)],
  [3, new Vector(-1, 0)],
  [4, new Vector(0, -1)],
  [5, new Vector(1, -1)],
]);

export function unitVectorToIdx(v: Vector): number {
  for (const [idx, uv] of idxToUnitVector.entries()) {
    if (v.eq(uv)) return idx;
  }
  return 0;
}
