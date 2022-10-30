import { DOMWidgetModel, ISerializers } from '@jupyter-widgets/base';
import React from 'react';
import ImageViewerWidget from '../react-widgets/ImageViewer';
import ReactDOM from 'react-dom';
import { JBaseWidget, createUseModelState, JModel } from './jbasewidget';
import {
  byte_serializer,
  point_serializer,
  transform_serializer,
} from './serializers';
import { Transform } from '../utils/zoom-pan-handler';
import { Point } from '../utils/point';

/**************************************************************************
 *              --- WIDGET ---
 **************************************************************************/

export class JImageViewer extends JBaseWidget {
  render(): void {
    this.el.classList.add('custom-widget');
    this.el.classList.add('maximizing-widget');

    const component = React.createElement(ImageViewerWidget, {
      model: this.model,
      events: {
        onClick: (ev) => {
          this.send_event('onclick', {
            x: ev.cursor.x,
            y: ev.cursor.y,
            altKey: ev.altKey,
            metaKey: ev.metaKey,
            ctrlKey: ev.ctrlKey,
            shiftKey: ev.shiftKey,
            button: ev.button,
          });
        },
      },
    });
    ReactDOM.render(component, this.el);
  }
}

/**************************************************************************
 *              --- MODEL ---
 **************************************************************************/

const defaultState = {
  _instance_id: 0,
  _data: 'default',
  _size: Point.ORIGIN,
  linkedTransform: false,
  _transform: { center: Point.ORIGIN, zoom: 0 } as Transform,
};

export type JImageViewerState = typeof defaultState;

export class JImageViewerModel extends JModel {
  protected view_name = 'JImageViewer';
  protected model_name = 'JImageViewerModel';

  get defaultState(): any {
    return defaultState;
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    _data: byte_serializer,
    _size: point_serializer,
    _transform: transform_serializer,
  };

  static use = createUseModelState<JImageViewerState>();
}
