import { Transform } from '../utils/zoom-pan-handler';
import { Point } from '../utils/point';

export const byte_serializer = {
  deserialize: (value: DataView) => {
    const decoder = new TextDecoder('ascii');
    return decoder.decode(value);
  },
};

export const transform_serializer = {
  deserialize: (t: Array<number>): Transform => {
    return { center: new Point(t[0], t[1]), zoom: t[2] };
  },
  serialize: (t: Transform): Array<number> => [t.center.x, t.center.y, t.zoom],
};

export const point_serializer = {
  deserialize: (p: Array<number>): Point => new Point(p[0], p[1]),
  serialize: (p: Point): Array<number> => [p.x, p.y],
};
