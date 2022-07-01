import {
  MouseEvent as SyntheticMouseEvent,
  RefObject,
  useCallback,
  useEffect,
  useState,
  useRef,
  // useReducer,
} from 'react';

// import { ORIGIN, Point } from './point';
import { Point } from './point';
import useSize from './size-context';
//import useEventListener from "./event-listener";

export interface Transform {
  center: Point;
  scale: number;
}

type ZoomPanOptions = {
  sceneSize: Point;
  ref: RefObject<HTMLElement | null>;
  maxScale: number;
};

function computeViewSize(opt: ZoomPanOptions): Point {
  return new Point(opt.ref.current?.clientWidth, opt.ref.current?.clientHeight);
}

const checkScale = (scale: number, opt: ZoomPanOptions): number => {
  const viewSize = computeViewSize(opt);

  const minZoom = viewSize.divide(opt.sceneSize).min();
  return Math.min(Math.max(scale, minZoom), opt.maxScale);
};

const checkCenter = (transform: Transform, opt: ZoomPanOptions): Transform => {
  const viewSize = computeViewSize(opt);
  const scenePadding = viewSize
    .divide(transform.scale * 2)
    .clip(opt.sceneSize.divide(2));
  const center = transform.center.clip(
    opt.sceneSize.substract(scenePadding),
    scenePadding
  );
  return { scale: transform.scale, center: center };
};

export function view2scene(
  point: Point,
  transform: Transform,
  viewSize: Point
): Point {
  const deltaView = point.substract(viewSize.divide(2));
  return deltaView.divide(transform.scale).add(transform.center);
}

export default function useZoomPan(
  ref: RefObject<HTMLElement>,
  iniSceneSize: Point,
  maxScale = 20
): [
  Transform,
  (e: React.MouseEvent) => void,
  (logDelta: number, viewZoomCenter: Point) => void,
  React.Dispatch<React.SetStateAction<Point>>,
  (transform: Transform | ((t: Transform) => Transform)) => void,
  Point | null,
  (e: React.MouseEvent) => void,
  (e: React.MouseEvent) => void
] {
  const [sceneSize, setSceneSize] = useState(iniSceneSize);
  const [transform, setTransform] = useState({
    center: sceneSize.divide(2),
    scale: 1,
  });

  const [cursorPos, setCursorPos] = useState<Point | null>(null);

  const opt = { sceneSize: sceneSize, maxScale: maxScale, ref: ref };
  const viewSize = useSize(ref);

  const updateTransform = (
    transform: Transform | ((t: Transform) => Transform)
  ): void => {
    if ('scale' in transform) {
      setTransform(transform);
    } else {
      setTransform((t: Transform) => {
        t = transform(t);
        t.scale = checkScale(t.scale, opt);
        t = checkCenter(t, opt);
        return t;
      });
    }
  };

  const zoom = (logDelta: number, viewZoomCenter?: Point) => {
    setTransform((currentTransform) => {
      const scaleFactor = Math.pow(2, logDelta);
      const newScale = checkScale(currentTransform.scale * scaleFactor, opt);

      let center = currentTransform.center;
      if (viewZoomCenter !== undefined) {
        const delta = viewZoomCenter
          .substract(viewSize.divide(2))
          .multiply(1 / newScale - 1 / currentTransform.scale);
        center = center.substract(delta);
      }
      return checkCenter({ center: center, scale: newScale }, opt);
    });

    if (viewZoomCenter !== undefined) {
      const cursorPos = view2scene(viewZoomCenter, transform, viewSize);
      setCursorPos(cursorPos.floor());
    }
  };

  const panning = useRef(false);

  const pan = useCallback(
    (e: MouseEvent) => {
      const delta = new Point(e.movementX, e.movementY);
      setTransform((currentTransform) => {
        const transform = {
          center: currentTransform.center.substract(
            delta.divide(currentTransform.scale)
          ),
          scale: currentTransform.scale,
        };
        return checkCenter(transform, opt);
      });
    },
    [ref, opt]
  );

  useEffect(() => zoom(0), [viewSize, sceneSize]);

  // Tear down listeners.
  const endPan = useCallback(() => {
    document.exitPointerLock();
    document.removeEventListener('mousemove', pan);
    document.removeEventListener('mouseup', endPan);
    panning.current = false;
  }, [pan, panning]);

  // Set up listeners.
  const startPan = useCallback(
    (e: SyntheticMouseEvent) => {
      ref.current?.requestPointerLock();
      document.addEventListener('mousemove', pan, false);
      document.addEventListener('mouseup', endPan);
      panning.current = true;
      setCursorPos(null);
    },
    [pan, endPan, ref, panning]
  );

  const mouseMove = useCallback(
    (e: SyntheticMouseEvent): void => {
      if (ref.current === null || panning.current) {
        return;
      }
      e.preventDefault();
      const bounds = ref.current.getBoundingClientRect();
      const point = new Point(e.clientX - bounds.left, e.clientY - bounds.top);
      const cursorPos = view2scene(point, transform, viewSize);
      if (cursorPos.in(sceneSize)) {
        setCursorPos(cursorPos.floor());
      } else {
        setCursorPos(null);
      }
    },
    [setCursorPos, transform, viewSize, sceneSize, panning]
  );

  const mouseOut = useCallback(
    (e: SyntheticMouseEvent): void => {
      e.preventDefault();
      setCursorPos(null);
    },
    [setCursorPos]
  );

  return [
    transform,
    startPan,
    zoom,
    setSceneSize,
    updateTransform,
    cursorPos,
    mouseMove,
    mouseOut,
  ];
}
/*
// -----
const constraintScale = (scale: number, state: ZoomAreaState): number => {
  return Math.min(Math.max(scale, state.minScale), state.maxScale);
};

const constraintCenter = (
  transform: Transform,
  state: ZoomAreaState
): Transform => {
  const scenePadding = state.viewSize
    .divide(transform.scale * 2)
    .clip(state.sceneSize.divide(2));
  const center = transform.center.clip(
    state.sceneSize.substract(scenePadding),
    scenePadding
  );
  return { scale: transform.scale, center: center };
};
/*
const applyZoom = (
  t: Transform,
  logDelta: number,
  state: ZoomAreaState,
  viewZoomCenter?: Point
) => {
  const newScale = constraintScale(t.scale * Math.pow(2, logDelta), state);

  let center = t.center;
  if (viewZoomCenter !== undefined) {
    const delta = viewZoomCenter
      .substract(state.viewSize.divide(2))
      .multiply(1 / newScale - 1 / t.scale);
    center = center.substract(delta);
  }
  return constraintCenter({ center: center, scale: newScale }, state);
};

interface ZoomAreaState {
  sceneSize: Point;
  viewSize: Point;
  maxScale: number;
  minScale: number;
  ref: RefObject<HTMLElement>;
}

export function manageZoomArea(
  transformIni: Transform,
  setTransform: (t: Transform) => void
) {
  const [transform, dispatch] = useReducer(
    (t: Transform, action: TransformAction): Transform => {
      if ('transform' in action) {
        return action.transform;
      } else if ('zoom' in action) {
        return applyZoom(t, action.zoom, , action.zoomCenter);
      }
      return t;
    },
    { center: ORIGIN, scale: 0 }
  );
  return { transform: transform, dispatch: dispatch };
}
*/
interface SetTransform {
  transform: Transform;
}

interface Zoom {
  zoom: number;
  zoomCenter: Point;
}

interface Pan {
  pan: Point;
}

interface SetSceneSize {
  sceneSize: Point;
}

export type TransformAction = SetTransform | Zoom | Pan;

export type ZoomAction = SetSceneSize | TransformAction;
