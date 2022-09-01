import {
  RefObject,
  useEffect,
  useState,
  useReducer,
  useMemo,
  useLayoutEffect,
} from 'react';

import { ORIGIN, Point, Rect } from './point';
import { Observable } from 'rxjs';
import useResizeObserver from '@react-hook/resize-observer';
import { Animator, Animation } from './animator';

export interface Transform {
  center: Point;
  coord?: 'scene' | 'relative';
  zoom: number;
}

export type Coord = 'view' | 'scene' | 'relative';

// =========================================================================
//          --- ZOOM STATE ---
// =========================================================================

class ZoomAreaState {
  protected _viewSize: Point;
  protected _maxZoom?: number;

  constructor(
    protected _ref: RefObject<HTMLElement>,
    protected _sceneSize: Point,
    protected _maxScale: number,
    protected _minScale?: number
  ) {}

  // === Zoom Area Properties ===
  public get node(): HTMLElement | null {
    return this._ref.current;
  }

  public getViewBoundingRect(): Rect {
    return this._ref.current
      ? Rect.fromDOMRect(this._ref.current.getBoundingClientRect())
      : Rect.fromCenter(ORIGIN, ORIGIN);
  }

  public get viewSize(): Point {
    if (!this._viewSize) {
      this._viewSize = this.getViewBoundingRect().size;
    }
    return this._viewSize;
  }

  public set viewSize(s: Point) {
    this._viewSize = s;
    this._minScale = undefined;
    this._maxZoom = undefined;
  }

  public get sceneSize(): Point {
    return this._sceneSize;
  }

  public set sceneSize(p: Point) {
    this._sceneSize = p;
    this._minScale = undefined;
  }

  public get minScale(): number {
    if (this._minScale === undefined) {
      this._minScale = this.viewSize.divide(this.sceneSize).min() + 1e-8;
    }
    return this._minScale;
  }

  public get maxScale(): number {
    return this._maxScale;
  }

  public get maxZoom(): number {
    if (this._maxZoom === undefined) {
      this._maxZoom = this.scale2zoom(this.maxScale);
    }
    return this._maxZoom;
  }

  // === Convertions ===
  public scale2zoom(s: number): number {
    return Math.log2(s / this.minScale);
  }

  public zoom2scale(z: number): number {
    return Math.pow(2, z) * this.minScale;
  }

  public sceneCenter(t: Transform): Point {
    return t.coord === 'relative'
      ? t.center.multiply(this.sceneSize)
      : t.center;
  }

  public relativeCenter(t: Transform): Point {
    return t.coord === 'relative' ? t.center : t.center.divide(this.sceneSize);
  }

  public relativeTransform(t: Transform): Transform {
    return t.coord === 'relative'
      ? t
      : { ...t, center: t.center.divide(this.sceneSize), coord: 'relative' };
  }

  public relativeCoord(p: Point, t: Transform, coord?: Coord): Point {
    switch (coord) {
      case 'view':
        p = p
          .substract(this.viewSize.divide(2))
          .divide(this.zoom2scale(t.zoom));
        return t.coord === 'relative'
          ? p.divide(this.sceneSize).add(t.center)
          : p.add(t.center).divide(this.sceneSize);
      case 'relative':
        return p;
      default: // 'scene'
        return p.divide(this.sceneSize);
    }
  }

  public sceneCoord(p: Point, t: Transform, coord?: Coord): Point {
    switch (coord) {
      case 'view':
        return p
          .substract(this.viewSize.divide(2))
          .divide(this.zoom2scale(t.zoom))
          .add(this.sceneCenter(t));
      case 'relative':
        return p.multiply(this.sceneSize);
        ZoomAreaState;
      default: // 'scene'
        return p;
    }
  }

  public viewCoord(p: Point, t: Transform, coord?: Coord): Point {
    switch (coord) {
      case 'view':
        return p;
      case 'relative':
        if (t.coord === 'relative') {
          p = p.substract(t.center).multiply(this.sceneSize);
        } else {
          p = p.multiply(this.sceneSize).substract(t.center);
        }
        break;
      default: // 'scene'
        p = p.substract(this.sceneCenter(t));
        break;
    }

    return p.multiply(this.zoom2scale(t.zoom)).add(this.viewSize.divide(2));
  }

  public transform2VisibleArea(t: Transform): Rect {
    return Rect.fromCenter(
      this.sceneCenter(t),
      this.viewSize.divide(this.zoom2scale(t.zoom))
    );
  }

  public visibleArea2Transform(visibleArea: Rect): Transform {
    let center = visibleArea.center;
    if (visibleArea.in(Rect.unitary())) {
      visibleArea = visibleArea.scale(this.viewSize);
    } else {
      center = center.divide(this.sceneSize);
    }
    return {
      zoom: this.scale2zoom(this.viewSize.divide(visibleArea.size).min()),
      center: center,
      coord: 'relative',
    };
  }

  // === Constraint Safeguards ===
  public constraintZoom(zoom: number): number {
    return Math.min(Math.max(zoom, 0), this.maxZoom);
  }

  public constraintCenter(transform: Transform): Transform {
    const center = transform.center;
    if (isNaN(transform.center.x) || isNaN(transform.center.y)) {
      return { ...transform, center: ORIGIN };
    }
    const scale = this.zoom2scale(transform.zoom);
    const pad = this.viewSize.divide(2 * scale).clip(this.sceneSize.divide(2));
    const centerBoundaries =
      transform.coord === 'relative'
        ? Rect.unitary().pad(pad.divide(this.sceneSize))
        : new Rect(this.sceneSize).pad(pad);
    return { ...transform, center: center.clip(centerBoundaries) };
  }

  public constraintTransform(t: Transform): Transform {
    const zoom = this.constraintZoom(t.zoom);
    return this.constraintCenter({ ...t, zoom: zoom });
  }

  public applyZoom(
    t: Transform,
    dZoom: number,
    zoomCenter?: Point,
    coord?: Coord
  ): Transform {
    const newZoom = this.constraintZoom(t.zoom + dZoom);
    dZoom = newZoom - t.zoom;
    if (dZoom === 0) {
      return t;
    }

    if (zoomCenter) {
      let center = this.sceneCenter(t);
      let dCenter: Point;
      if (coord === 'view') {
        dCenter = zoomCenter
          .substract(this.viewSize.divide(2))
          .multiply(1 / this.zoom2scale(t.zoom) - 1 / this.zoom2scale(newZoom));
      } else {
        if (coord === 'relative') {
          zoomCenter = zoomCenter.multiply(this.zoom2scale(t.zoom));
        }
        dCenter = zoomCenter
          .substract(center)
          .multiply(1 - Math.pow(2, -dZoom));
      }
      center = center.add(dCenter);
      const newT = this.constraintCenter({ center: center, zoom: newZoom });
      return newT;
    }
    return this.constraintCenter({ ...t, zoom: newZoom });
  }
}

export class ZoomTransform {
  public dispatch: ZoomDispatch;
  public animator: Animator<'center' | 'zoom'>;
  public animationTarget?: Transform;
  protected _scale: number;
  protected _t: Transform;
  public syncTransform?: [Observable<Transform>, (t: Transform) => void];

  constructor(public areaState: ZoomAreaState, transform: Transform) {
    this.animator = new Animator<'center' | 'zoom'>(
      (t) => {
        this.dispatch({
          animStep: {
            center: t['center'] as Point,
            zoom: t['zoom'] as number,
            coord: 'relative',
          },
        });
      },
      { onStop: () => (this.animationTarget = undefined) }
    );
    this.transform = transform;
  }

  public get transform(): Transform {
    return this._t;
  }

  public set transform(t: Transform) {
    this._t = t;
    this._scale = this.areaState.zoom2scale(t.zoom);
  }

  sceneCoord(p: Point, coord: Coord = 'view'): Point {
    return this.areaState.sceneCoord(p, this._t, coord);
  }

  viewCoord(p: Point, coord: Coord = 'scene'): Point {
    return this.areaState.viewCoord(p, this._t, coord);
  }

  relativeCoord(p: Point, coord: Coord = 'scene'): Point {
    return this.areaState.relativeCoord(p, this._t, coord);
  }

  view2scene(p: Point): Point {
    return p
      .substract(this.areaState.viewSize.divide(2))
      .divide(this.scale)
      .add(this.center);
  }

  scene2view(p: Point): Point {
    return p
      .substract(this.center)
      .multiply(this.scale)
      .add(this.areaState.viewSize.divide(2));
  }

  get scale(): number {
    return this._scale;
  }

  get center(): Point {
    return this.areaState.sceneCenter(this._t);
  }

  get viewOffset(): Point {
    return this.areaState
      .sceneCenter(this._t)
      .multiply(this.scale)
      .substract(this.areaState.viewSize.divide(2));
  }

  get visibleArea(): Rect {
    return Rect.fromCenter(
      this.transform.center,
      this.areaState.viewSize.divide(this.transform.zoom)
    );
  }
}

export function useZoomTransform(
  ref: RefObject<HTMLElement>,
  sceneSize: Point,
  maxScale: number,
  syncTransform?: [Observable<Transform>, (t: Transform) => void]
): ZoomTransform {
  // --- Initialization ---
  const iniAreaState: ZoomAreaState = new ZoomAreaState(
    ref,
    sceneSize,
    maxScale
  );

  // --- States ---
  const iniTransform: Transform = {
    center: new Point(0.5, 0.5),
    zoom: 0,
    coord: 'relative',
  };

  const [[zoomTransform], dispatch] = useReducer(
    (
      zoomState: [ZoomTransform, Transform],
      action: ZoomAction
    ): [ZoomTransform, Transform] => {
      const [zoomTransform, previousTransform] = zoomState;
      let t = previousTransform;
      const state = zoomTransform.areaState;
      let newT = t;

      // --- Apply action ---
      if ('syncTransform' in action) {
        newT = state.constraintTransform(action.syncTransform);
        zoomTransform.transform = newT;
        return [zoomTransform, newT];
      } else if ('animStep' in action) {
        newT = action.animStep;
      } else {
        if (zoomTransform.animator.running) {
          if (zoomTransform.animationTarget) {
            t = zoomTransform.animationTarget;
            newT = t;
          }
          zoomTransform.animator.stop();
        }

        if ('transform' in action) {
          newT = state.constraintTransform(action.transform);
        } else if ('zoom' in action) {
          newT = state.applyZoom(
            t,
            action.zoom,
            action.zoomCenter,
            action.zoomCenterCoord
          );
        } else if ('pan' in action) {
          let dCenter = action.pan;
          if (action.coord === 'relative') {
            dCenter = dCenter.multiply(state.sceneSize);
          } else if (action.coord === 'view') {
            dCenter = dCenter.multiply(zoomTransform.scale);
          }
          newT = state.constraintCenter({
            zoom: t.zoom,
            center: state.sceneCenter(t).add(dCenter),
          });
        } else if ('ensureVisible' in action) {
          newT = state.visibleArea2Transform(action.ensureVisible);
        } else if ('sceneSize' in action) {
          const relCenter =
            t.coord === 'relative'
              ? t.center
              : t.center.divide(state.sceneSize);
          zoomTransform.areaState.sceneSize = action.sceneSize;
          newT = zoomTransform.areaState.constraintCenter({
            center: relCenter,
            coord: 'relative',
            zoom: t.zoom,
          });
        } else if ('viewSize' in action) {
          zoomTransform.areaState.viewSize = action.viewSize;
          newT = zoomTransform.areaState.constraintTransform(t);
        }

        if ('animation' in action) {
          // Setup animation if required
          if (action.animation?.cancelable === false) {
            zoomTransform.animationTarget = newT;
          }

          let centerAnim = action.animation?.centerAnim;
          const c0 = state.relativeCenter(t);
          const c1 = state.relativeCenter(newT);
          if (centerAnim) {
            centerAnim.firstKey.v = c0;
            centerAnim.lastKey.v = c1;
          }

          let zoomAnim = action.animation?.scaleAnim;
          if (zoomAnim) {
            zoomAnim.firstKey.v = t.zoom;
            zoomAnim.lastKey.v = newT.zoom;
          } else {
            if (newT.zoom < t.zoom) {
              // Zoom out
              zoomAnim = Animation.simple(t.zoom, newT.zoom, 'quadraticOut');
              if (!centerAnim) {
                centerAnim = new Animation([
                  { t: 0.2, v: c0, easing: 'cubicInOut' },
                  { t: 1, v: c1 },
                ]);
              }
            } else if (
              newT.zoom - t.zoom < -0.5 || // Small zoom in
              state.sceneCenter(t).substract(state.sceneCenter(newT)).norm() *
                zoomTransform.scale <
                state.viewSize.max() / 2 // or moving to a close target
            ) {
              // Small Zoom in displacement
              zoomAnim = Animation.simple(t.zoom, newT.zoom, 'quadraticOut');
              if (!centerAnim) {
                centerAnim = new Animation([
                  { t: 0, v: c0, easing: 'cubicOut' },
                  { t: 0.9, v: c1 },
                ]);
              }
            } else {
              // Large Zoom in displacement
              const zoomOut = Math.sqrt(t.zoom + 1) - 1;
              zoomAnim = new Animation([
                { t: 0, v: t.zoom, easing: 'cubicOut' },
                { t: 0.3, v: zoomOut, easing: 'cubicInOut' },
                { t: 1, v: newT.zoom },
              ]);
              if (!centerAnim) {
                centerAnim = new Animation([
                  { t: 0, v: c0, easing: 'cubicInOut' },
                  { t: 0.9, v: c1 },
                ]);
              }
            }
          }

          if (!centerAnim) {
            centerAnim = Animation.simple(c0, c1, 'cubicInOut');
          }

          zoomTransform.animator.run(
            {
              center: centerAnim,
              zoom: zoomAnim,
            },
            action.animation?.duration || 750
          );
          return [zoomTransform, t];
        }
      }

      // --- Update transform ---
      if (zoomTransform.syncTransform) {
        zoomTransform.syncTransform[1](
          zoomTransform.areaState.relativeTransform(newT)
        );
      }
      zoomTransform.transform = newT;
      return [zoomTransform, newT];
    },
    [new ZoomTransform(iniAreaState, iniTransform), iniTransform]
  );

  // --- Observers ---
  useLayoutEffect(() => {
    dispatch({ sceneSize: sceneSize });
  }, [sceneSize.x, sceneSize.y]);

  useLayoutEffect(() => {
    zoomTransform.syncTransform = syncTransform;
    if (!syncTransform) {
      return;
    }
    const sub = syncTransform[0].subscribe((t: Transform) =>
      dispatch({ syncTransform: t })
    );
    return () => {
      sub.unsubscribe();
    };
  }, [syncTransform, zoomTransform]);

  useResizeObserver(ref, (entry) => {
    const { width, height } = entry.contentRect;
    const viewSize = new Point(width, height);
    if (viewSize !== zoomTransform.areaState.viewSize) {
      dispatch({ viewSize: viewSize });
    }
  });

  if (zoomTransform.dispatch !== dispatch) {
    zoomTransform.dispatch = dispatch;
  }

  return zoomTransform;
}

// =========================================================================
//          --- SCENE MOUSE EVENT ---
// =========================================================================

export interface SceneMouseEvent {
  cursor: Point;
  viewCursor: Point;
  movement: Point;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  button: number;
  buttons: number;
}

function createSceneMouseEvent(
  ev: MouseEvent,
  cursor: Point,
  viewCursor: Point,
  movement: Point
): SceneMouseEvent {
  return {
    cursor: cursor,
    viewCursor: viewCursor,
    movement: movement,
    altKey: ev.altKey,
    ctrlKey: ev.ctrlKey,
    shiftKey: ev.shiftKey,
    metaKey: ev.metaKey,
    button: ev.button,
    buttons: ev.buttons,
  };
}

export interface SceneWheelEvent {
  cursor: Point;
  viewCursor: Point;
  deltaX: number;
  deltaY: number;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  button: number;
  buttons: number;
}

function createSceneWheelEvent(
  ev: WheelEvent,
  cursor: Point,
  viewCursor: Point
): SceneWheelEvent {
  return {
    cursor: cursor,
    viewCursor: viewCursor,
    deltaX: ev.deltaX / 100,
    deltaY: ev.deltaY / 100,
    altKey: ev.altKey,
    ctrlKey: ev.ctrlKey,
    shiftKey: ev.shiftKey,
    metaKey: ev.metaKey,
    button: ev.button,
    buttons: ev.buttons,
  };
}

class ZoomControls {
  public panning = false;
  public initialEvent: SceneMouseEvent | undefined = undefined;
  public lastEvent: SceneMouseEvent | undefined = undefined;

  constructor(protected zoomTransform: ZoomTransform) {}

  startPan(ev: SceneMouseEvent): void {
    this.zoomTransform.areaState.node?.requestPointerLock();
    this.panning = true;
    this.lastEvent = ev;
    this.initialEvent = ev;
  }

  endPan(): void {
    document.exitPointerLock();
    this.panning = false;
    this.lastEvent = undefined;
    this.initialEvent = undefined;
  }

  pan(translate: Point): void {
    this.zoomTransform.dispatch({ pan: translate });
  }

  zoom(factor: number, center?: Point): void {
    this.zoomTransform.dispatch({ zoom: factor, zoomCenter: center });
  }
}

export interface MouseEventsListener {
  onMouseDown?: (ev: SceneMouseEvent, ctrls: ZoomControls) => void;
  onMouseUp?: (ev: SceneMouseEvent, ctrls: ZoomControls) => void;
  onMouseMove?: (ev: SceneMouseEvent, ctrls: ZoomControls) => void;
  onMouseLeave?: (ev: SceneMouseEvent, ctrls: ZoomControls) => void;
  onClick?: (ev: SceneMouseEvent, ctrls: ZoomControls) => void;
  onWheel?: (ev: SceneWheelEvent, ctrls: ZoomControls) => void;
}

type Timeout = ReturnType<typeof setTimeout>;

interface ClickTimer {
  timeout: Timeout;
  startPos: Point;
  lastPos: Point;
  mouseDownEvent: SceneMouseEvent;
}

export function useSceneMouseEventListener(
  zoomTransform: ZoomTransform,
  userEvents?: MouseEventsListener,
  hoverEvents = true
) {
  const [cursorPos, setCursorPos] = useState<Point | null>(null);

  // --- Default Zoom events Handlers ---
  const events = useMemo(() => {
    const events: MouseEventsListener = userEvents || {};

    if (!userEvents?.onMouseDown) {
      events.onMouseDown = (ev, ctrls) => {
        if (ev.button === 0) {
          ctrls.startPan(ev);
          setCursorPos(null);
        }
      };
    }
    events.onMouseMove = (ev, ctrls) => {
      if (ctrls.panning && ctrls.lastEvent) {
        ctrls.pan(ev.movement.neg());
      } else {
        if (userEvents?.onMouseMove) {
          userEvents.onMouseMove(ev, ctrls);
        }
        if (hoverEvents) {
          setCursorPos(ev.cursor.floor());
        }
      }
      ctrls.lastEvent = ev;
    };
    events.onMouseUp = (ev, ctrls) => {
      if (ctrls.panning && ev.button === ctrls.initialEvent?.button) {
        ctrls.endPan();
        setCursorPos(ev.cursor.floor());
      } else if (userEvents?.onMouseUp) {
        userEvents.onMouseUp(ev, ctrls);
      }
    };
    events.onMouseLeave = (ev, ctrls) => {
      if (ctrls.panning) {
        ctrls.endPan();
      }
      if (userEvents?.onMouseLeave) {
        userEvents.onMouseLeave(ev, ctrls);
      }
      if (hoverEvents) {
        setCursorPos(null);
      }
    };
    events.onClick = (ev, ctrls) => {
      if (ctrls.panning && ev.button === ctrls.initialEvent?.button) {
        ctrls.endPan();
      }
    };

    if (!userEvents?.onWheel) {
      events.onWheel = (ev) => {
        zoomTransform.dispatch({
          zoom: -ev.deltaY,
          zoomCenter: ev.viewCursor,
          zoomCenterCoord: 'view',
        });
      };
    }

    return events;
  }, [userEvents]);

  // --- Interactions Functions ---
  useEffect(() => {
    const node = zoomTransform.areaState.node;
    if (!node) {
      return;
    }

    const zoomCtrls = new ZoomControls(zoomTransform);

    // Wheel events
    const wheelEL = (ev: WheelEvent) => {
      if (!events?.onWheel) {
        return;
      }
      ev.preventDefault();
      const bounds = Rect.fromDOMRect(node.getBoundingClientRect());
      const viewPos = new Point(ev.clientX, ev.clientY).substract(
        bounds.topLeft
      );
      const sceneWheelEvent = createSceneWheelEvent(
        ev,
        zoomTransform.view2scene(viewPos),
        viewPos
      );
      events?.onWheel(sceneWheelEvent, zoomCtrls);
    };

    // Mouse events
    const clickTimers: { [id: number]: ClickTimer | null } = {
      0: null,
      1: null,
      2: null,
      3: null,
      4: null,
    };

    const mouseEL = (ev: MouseEvent) => {
      ev.preventDefault();
      const bounds = Rect.fromDOMRect(node.getBoundingClientRect());
      const viewPos = new Point(ev.clientX, ev.clientY).substract(
        bounds.topLeft
      );
      const sceneMouseEvent = createSceneMouseEvent(
        ev,
        zoomTransform.view2scene(viewPos),
        viewPos,
        new Point(ev.movementX, ev.movementY).divide(zoomTransform.scale)
      );

      const clickTimer = clickTimers[ev.button];
      if (ev.type === 'mousemove') {
        if (clickTimer) {
          if (viewPos.substract(clickTimer.startPos).norm() < 5) {
            clickTimer.lastPos = viewPos;
            return;
          }
          clearTimeout(clickTimer.timeout);
          clickTimers[ev.button] = null;
          events?.onMouseDown &&
            events.onMouseDown(clickTimer.mouseDownEvent, zoomCtrls);

          // Compute mouse movement from ignored event during timer
          const delta = clickTimer.lastPos
            .substract(clickTimer.startPos)
            .divide(zoomTransform.scale);
          sceneMouseEvent.movement = sceneMouseEvent.movement.add(delta);
          sceneMouseEvent.cursor = sceneMouseEvent.cursor.add(delta);
        }
        events?.onMouseMove && events.onMouseMove(sceneMouseEvent, zoomCtrls);
      } else if (ev.type === 'mousedown') {
        if (clickTimer) {
          clearTimeout(clickTimer.timeout);
        }
        clickTimers[ev.button] = {
          startPos: viewPos,
          lastPos: viewPos,
          mouseDownEvent: sceneMouseEvent,
          timeout: setTimeout(() => {
            const c = clickTimers[ev.button];
            if (c) {
              clickTimers[ev.button] = null;
              events?.onMouseDown &&
                events.onMouseDown(c.mouseDownEvent, zoomCtrls);

              // Compute mouse movement from ignored event during timer
              const delta = c.lastPos
                .substract(c.startPos)
                .divide(zoomTransform.scale);
              sceneMouseEvent.movement = delta;
              sceneMouseEvent.cursor = sceneMouseEvent.cursor.add(delta);
              events?.onMouseMove &&
                events.onMouseMove(sceneMouseEvent, zoomCtrls);
            }
          }, 750),
        };
      } else if (ev.type === 'mouseup') {
        if (clickTimer) {
          clearTimeout(clickTimer.timeout);
          clickTimers[ev.button] = null;
          events?.onClick && events.onClick(sceneMouseEvent, zoomCtrls);
        } else {
          events?.onMouseUp && events.onMouseUp(sceneMouseEvent, zoomCtrls);
        }
      } else if (ev.type === 'mouseleave') {
        events?.onMouseLeave && events.onMouseLeave(sceneMouseEvent, zoomCtrls);
      }
    };

    node.addEventListener('wheel', wheelEL);
    node.addEventListener('mousemove', mouseEL);
    node.addEventListener('mousedown', mouseEL);
    node.addEventListener('mouseup', mouseEL);
    node.addEventListener('mouseleave', mouseEL);

    return () => {
      node.removeEventListener('wheel', wheelEL);
      node.removeEventListener('mousemove', mouseEL);
      node.removeEventListener('mousedown', mouseEL);
      node.removeEventListener('mouseup', mouseEL);
      node.removeEventListener('mouseleave', mouseEL);
    };
  }, [zoomTransform, zoomTransform.areaState.node]);

  return cursorPos;
}

// Actions
interface ZoomAnimation {
  duration?: number;
  centerAnim?: Animation<Point>;
  scaleAnim?: Animation<number>;
  cancelable?: boolean;
}

interface SetTransform {
  transform: Transform;
  animation?: ZoomAnimation;
}

interface Zoom {
  zoom: number;
  zoomCenter?: Point;
  zoomCenterCoord?: Coord;
  animation?: ZoomAnimation;
}

interface Pan {
  pan: Point;
  coord?: Coord;
  animation?: ZoomAnimation;
}

interface EnsureVisible {
  ensureVisible: Rect;
  animation?: ZoomAnimation;
}

interface SetSceneSize {
  sceneSize: Point;
}

interface SetViewSize {
  viewSize: Point;
}

interface AnimStep {
  animStep: Transform;
}

interface SyncTransform {
  syncTransform: Transform;
}

export type TransformAction = SetTransform | Zoom | Pan | EnsureVisible;
export type ZoomAction =
  | SetSceneSize
  | SetViewSize
  | AnimStep
  | TransformAction
  | SyncTransform;
export type ZoomDispatch = React.Dispatch<ZoomAction>;
