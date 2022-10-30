export class Point {
  constructor(public x = 0, public y = 0) {}

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

  interpolate(to: Point, weight: number): Point {
    return new Point(
      this.x * (1 - weight) + to.x * weight,
      this.y * (1 - weight) + to.y * weight
    );
  }

  clip(r: Rect | Point): Point {
    if (r instanceof Point) {
      return new Point(Math.min(r.x, this.x), Math.min(r.y, this.y));
    } else {
      return new Point(
        Math.min(r.bottomRight.x, Math.max(r.topLeft.x, this.x)),
        Math.min(r.bottomRight.y, Math.max(r.topLeft.y, this.y))
      );
    }
  }

  in(r: Rect | Point, strict = false): boolean {
    if (r instanceof Point) {
      return strict
        ? this.x < r.x && this.y < r.y
        : this.x <= r.x && this.y <= r.y;
    }
    if (strict) {
      return (
        r.topLeft.x < this.x &&
        this.x < r.bottomRight.x &&
        r.topLeft.y < this.y &&
        this.y < r.bottomRight.y
      );
    } else {
      return (
        r.topLeft.x <= this.x &&
        this.x <= r.bottomRight.x &&
        r.topLeft.y <= this.y &&
        this.y <= r.bottomRight.y
      );
    }
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

  neg(): Point {
    return new Point(-this.x, -this.y);
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

  static ORIGIN = Object.freeze(new Point(0, 0));
}

export const ORIGIN = Point.ORIGIN;

export class Rect {
  topLeft: Point;
  bottomRight: Point;

  constructor(topLeft: Point, bottomRight: Point);
  constructor(bottomRight: Point);
  constructor(p1: Point, p2?: Point) {
    if (p2) {
      this.topLeft = p1;
      this.bottomRight = p2;
    } else {
      this.topLeft = ORIGIN;
      this.bottomRight = p1;
    }
  }

  static unitary(): Rect {
    return new Rect(new Point(1, 1));
  }

  static fromXY(x1: number, x2: number, y1: number, y2: number): Rect {
    return new Rect(new Point(x1, y1), new Point(x2, y2));
  }

  static fromCenter(center: Point, size: Point): Rect {
    const halfSize = size.divide(2);
    return new Rect(center.substract(halfSize), center.add(halfSize));
  }

  static fromDOMRect(r: DOMRect): Rect {
    return new Rect(new Point(r.left, r.top), new Point(r.right, r.bottom));
  }

  get top(): number {
    return this.topLeft.y;
  }

  get left(): number {
    return this.topLeft.x;
  }

  get right(): number {
    return this.bottomRight.x;
  }

  get bottom(): number {
    return this.bottomRight.y;
  }

  get width(): number {
    return this.bottomRight.x - this.topLeft.x;
  }

  get height(): number {
    return this.bottomRight.y - this.topLeft.y;
  }

  get size(): Point {
    return this.bottomRight.substract(this.topLeft);
  }

  get center(): Point {
    return this.bottomRight.add(this.topLeft).divide(2);
  }

  checkPositiveSize(): boolean {
    const size = this.size;
    return size.x >= 0 && size.y >= 0;
  }

  translate(f: number | Point): Rect {
    return new Rect(this.topLeft.add(f), this.bottomRight.add(f));
  }

  scale(s: number | Point): Rect {
    return new Rect(this.topLeft.multiply(s), this.bottomRight.multiply(s));
  }

  in(r: Rect, strict = false): boolean {
    return this.topLeft.in(r, strict) && this.bottomRight.in(r, strict);
  }

  intersection(r: Rect): Rect {
    return new Rect(this.topLeft.clip(r), this.bottomRight.clip(r));
  }

  pad(padding: Rect | Point | number, outward = false): Rect {
    let resultingRect: Rect;
    if (padding instanceof Rect) {
      if (outward) {
        padding = new Rect(
          ORIGIN.substract(padding.topLeft),
          ORIGIN.substract(padding.bottomRight)
        );
      }
      resultingRect = new Rect(
        this.topLeft.add(padding.topLeft),
        this.bottomRight.add(padding.bottomRight)
      );
    } else {
      if (outward) {
        padding = ORIGIN.substract(padding);
      }
      resultingRect = new Rect(
        this.topLeft.add(padding),
        this.bottomRight.substract(padding)
      );
    }
    if (resultingRect.checkPositiveSize()) {
      return resultingRect;
    } else {
      return Rect.fromCenter(resultingRect.center, ORIGIN);
    }
  }

  interpolate(to: Rect, weight: number): Rect {
    return new Rect(
      this.topLeft.interpolate(to.topLeft, weight),
      this.bottomRight.interpolate(to.bottomRight, weight)
    );
  }
}
