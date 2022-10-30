import React, { useMemo, useRef } from 'react';
import useSize from '../utils/size-context';
import '../../css/RulerAxis.css';
import useEventListener from '../utils/event-listener';
import {
  inInterval,
  Interval,
  isValidNumber,
  linspace,
  optiLog10Step,
  validNumber,
} from '../utils/math';

interface AxisRulerProps {
  orientation: 'horizontal' | 'vertical';
  thickness?: number;
  center?: number;
  onPanCenter?: (delta: number) => void;
  cursorPos?: number;
  scale: number;
  domain: number;
  style?: React.CSSProperties;
}

export default function RulerAxis(props: AxisRulerProps): JSX.Element {
  const hor = props.orientation === 'horizontal';
  const thickness = props.thickness ?? 20;
  const style = props.style ?? {};
  const ref = useRef<HTMLDivElement | null>(null);
  const size = useSize(ref);
  const axisSize = hor ? size.x : size.y;

  let preArea, postArea, ticks;
  let borderRadius = `${thickness / 2} px`;
  let labels, firstLabel, endLabel;
  let cursorTick;

  const axisDomain = props.domain;
  const scale = props.scale;

  if (isValidNumber(axisDomain) && isValidNumber(scale)) {
    const center = validNumber(props.center, axisDomain / 2);
    const axisRange = axisSize / scale;
    const rangeMin = center - axisRange / 2;
    const rangeMax = center + axisRange / 2;

    const cursorPos = props.cursorPos ?? null;

    if (cursorPos !== null) {
      const cursorTickPos = (cursorPos - rangeMin + 0.5) * scale;
      cursorTick = (
        <g
          transform={translateTick(cursorTickPos, hor)}
          className={'cursorTick'}
        >
          <rect
            x={hor ? -18 : 0}
            y={hor ? 0 : -18}
            width={hor ? 36 : thickness}
            height={hor ? thickness : 36}
            rx={thickness / 5}
            ry={thickness / 5}
          />
          <TickLabel
            length={thickness}
            horizontal={hor}
            label={cursorPos.toString()}
          />
        </g>
      );
    }

    // --- Label Ticks ---
    [preArea, postArea, firstLabel, endLabel, labels, ticks, borderRadius] =
      useMemo(() => {
        const preSize = Math.max(0, -rangeMin * scale - 1);
        const preArea = (
          <rect
            className={'out-of-domain'}
            x={0}
            y={0}
            height={hor ? thickness : preSize}
            width={!hor ? thickness : preSize}
          />
        );
        const postSize = Math.max(0, (rangeMax - axisDomain) * scale - 1);
        const postArea = (
          <rect
            className={'out-of-domain'}
            x={hor ? axisSize - postSize : 0}
            y={!hor ? axisSize - postSize : 0}
            height={hor ? thickness : postSize}
            width={!hor ? thickness : postSize}
          />
        );

        const skipIntervals = new Array<Interval>();

        const firstTickPos = -rangeMin * scale;
        const firstLabel = (
          <g transform={translateTick(firstTickPos, hor)}>
            <TickLabel
              className={'firstEndLabelTick'}
              length={thickness}
              tickLength={1}
              horizontal={hor}
              label={'0'}
              labelAnchor={'after'}
            />
          </g>
        );
        const firstTickInterval = {
          start: firstTickPos,
          end: firstTickPos + thickness / 2.5 + 3,
        };
        if (firstTickInterval.end >= 0) {
          skipIntervals.push(firstTickInterval);
        }

        const endTickPos = (axisDomain - rangeMin) * scale;
        const endLabel = (
          <g transform={translateTick(endTickPos, hor)}>
            <TickLabel
              className={'firstEndLabelTick'}
              length={thickness}
              tickLength={1}
              horizontal={hor}
              label={axisDomain.toString()}
              labelAnchor={'before'}
            />
          </g>
        );
        const endTickInterval = {
          start:
            endTickPos - 3 - (axisDomain.toString().length * thickness) / 2.5,
          end: endTickPos,
        };
        if (endTickInterval.start <= axisSize) {
          skipIntervals.push(endTickInterval);
        }

        // --- Labels Ticks ---
        const labelStep = optiLog10Step(scale, 80);
        const tickStep = optiLog10Step(scale, 12);
        const tickMin = Math.max(0, rangeMin);
        const tickMax = Math.min(axisDomain, rangeMax);

        labels = linspace(tickMin, tickMax, labelStep, true).map(
          (pos, i, { length }) => {
            const tickPos = (pos - rangeMin + 0.5) * scale;

            // Skip if in previous intervals
            if (
              skipIntervals.findIndex((v) => inInterval(tickPos, v, 10)) >= 0
            ) {
              return;
            }

            // Render label tick
            return (
              <g transform={translateTick(tickPos, hor)} key={pos}>
                <TickLabel
                  className={'firstEndLabelTick'}
                  length={thickness}
                  horizontal={hor}
                  label={Math.round(pos).toString()}
                />
              </g>
            );
          }
        );

        // --- Ticks ---
        ticks = linspace(tickMin, tickMax, tickStep, true, labelStep).map(
          (pos, i, { length }) => {
            const tickPos = (pos - rangeMin + 0.5) * scale;

            // Skip if in previous intervals
            if (
              skipIntervals.findIndex((v) => inInterval(tickPos, v, 2)) >= 0
            ) {
              return;
            }

            return (
              <g transform={translateTick(tickPos, hor)} key={pos}>
                <Tick length={thickness} horizontal={hor} />
              </g>
            );
          }
        );

        const minRadius = Math.min(tickMin * scale, thickness / 2);
        const maxRadius = Math.min(
          (axisDomain - tickMax) * scale,
          thickness / 2
        );
        const borderRadius = hor
          ? `${minRadius}px ${maxRadius}px ${maxRadius}px ${minRadius}px`
          : `${minRadius}px ${minRadius}px ${maxRadius}px ${maxRadius}px`;

        return [
          preArea,
          postArea,
          firstLabel,
          endLabel,
          labels,
          ticks,
          borderRadius,
        ];
      }, [axisSize, axisDomain, center, scale]);

    useEventListener(ref, 'wheel', (e) => {
      if (ref.current === null || props.onPanCenter === undefined) {
        return;
      }
      e.preventDefault();
      props.onPanCenter(e.deltaY / scale);
    });
  }

  return (
    <div
      ref={ref}
      className={'RulerAxis'}
      style={
        {
          height: hor ? thickness : '100%',
          width: hor ? '100%' : thickness,
          '--thickness': thickness,
          ...style,
        } as React.CSSProperties
      }
    >
      <svg
        xmlns={'http://www.w3.org/2000/svg'}
        style={{ borderRadius: borderRadius }}
      >
        {preArea}
        {postArea}
        {ticks}
        {labels}
        {firstLabel}
        {endLabel}
        {cursorTick}
      </svg>
    </div>
  );
}

interface TickProps {
  length: number;
  tickLength?: number;
  horizontal: boolean;
}

function translateTick(pos: number, hor: boolean) {
  return `translate(${hor ? pos : 0}, ${!hor ? pos : 0})`;
}

function Tick(props: TickProps): JSX.Element {
  const tickLength = props.length * (props.tickLength ?? 1 / 3);
  if (props.horizontal) {
    return (
      <line
        className={'tick'}
        x1={0}
        x2={0}
        y1={props.length - tickLength}
        y2={props.length}
      />
    );
  } else {
    return (
      <line
        className={'tick'}
        y1={0}
        y2={0}
        x1={props.length - tickLength}
        x2={props.length}
      />
    );
  }
}

interface TickLabelProps {
  length: number;
  horizontal: boolean;
  label: string;
  labelAnchor?: 'before' | 'middle' | 'after';
  tickLength?: number;
  className?: string;
}

function TickLabel(props: TickLabelProps): JSX.Element {
  const fontSize = props.length * (2 / 3);
  const textCenter = props.length / 3 + 1;
  const labelAnchor = props.labelAnchor ?? 'middle';
  const className = props.className ?? '';

  const tickProps = {
    length: props.length,
    horizontal: props.horizontal,
    tickLength: props.tickLength,
  };

  let style: React.CSSProperties = {};
  let labelOffset = 0;
  if (labelAnchor === 'before') {
    style = { textAnchor: props.horizontal ? 'end' : 'start' };
    labelOffset = -3;
  } else if (labelAnchor === 'after') {
    style = { textAnchor: props.horizontal ? 'start' : 'end' };
    labelOffset = 3;
  }

  if (props.horizontal) {
    return (
      <g className={'labelTick ' + className}>
        <text
          fontSize={fontSize}
          transform={`translate(${labelOffset}, ${textCenter})`}
          style={style}
        >
          {props.label}
        </text>
        <Tick {...tickProps} />
      </g>
    );
  } else {
    return (
      <g className={'labelTick ' + className}>
        <text
          fontSize={fontSize}
          transform={`translate(${textCenter}, ${labelOffset}) rotate(-90)`}
          style={style}
        >
          {props.label}
        </text>
        <Tick {...tickProps} />
      </g>
    );
  }
}
