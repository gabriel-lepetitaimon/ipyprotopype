export class Point {
  x: number;
  y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(f: number | Point): Point {
    return f instanceof Point
      ? new Point(this.x + f.x, this.y + f.y)
      : new Point(this.x + f, this.y + f);
  }

  substract(f: number | Point): Point {
    return f instanceof Point
      ? new Point(this.x - f.x, this.y - f.y)
      : new Point(this.x - f, this.y - f);
  }

  divide(f: number | Point): Point {
    return f instanceof Point
      ? new Point(this.x / f.x, this.y / f.y)
      : new Point(this.x / f, this.y / f);
  }

  multiply(f: number | Point): Point {
    return f instanceof Point
      ? new Point(this.x * f.x, this.y * f.y)
      : new Point(this.x * f, this.y * f);
  }

  clip(bottomRight: Point, topLeft?: Point): Point {
    return new Point(
      Math.min(bottomRight.x, topLeft ? Math.max(topLeft.x, this.x) : this.x),
      Math.min(bottomRight.y, topLeft ? Math.max(topLeft.y, this.y) : this.y)
    );
  }

  in(bottomRight: Point, topLeft = ORIGIN): boolean {
    return (
      topLeft.x <= this.x &&
      this.x <= bottomRight.x &&
      topLeft.y <= this.y &&
      this.y <= bottomRight.y
    );
  }

  round(): Point {
    return new Point(Math.round(this.x), Math.round(this.y));
  }

  floor(): Point {
    return new Point(Math.floor(this.x), Math.floor(this.y));
  }

  ceil(): Point {
    return new Point(Math.ceil(this.x), Math.ceil(this.y));
  }

  min(): number {
    return Math.min(this.x, this.y);
  }

  max(): number {
    return Math.max(this.x, this.y);
  }

  norm(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
}

export const ORIGIN = Object.freeze(new Point(0, 0));
