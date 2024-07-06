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
    return new Vector(this.x - other.x, this.y + other.y);
  }

  matmul(other: Vector): Vector {
    return new Vector(this.x * other.x, this.y * other.y);
  }

  round(): Vector {
    return new Vector(Math.round(this.x), Math.round(this.y));
  }
}
