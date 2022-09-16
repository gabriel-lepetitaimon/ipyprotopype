import {
  DOMWidgetModel,
  DOMWidgetView,
  ISerializers,
} from '@jupyter-widgets/base';
import React, { useState } from 'react';
import ImageViewerWidget from '../react-widgets/ImageViewer';
import ReactDOM from 'react-dom';
import { ORIGIN, Point } from '../utils/point';
import { Transform } from '../utils/zoom-pan-handler';
import { MODULE_NAME, MODULE_VERSION } from '../version';
import { useModel, useModelEvent } from './base-model';

const defaultImageViewerModelState = {
  _instance_id: 0,
  _data: 'default',
  _size: ORIGIN,
  linkedTransform: false,
  center: ORIGIN,
  scale: 0,
};

export class ImageViewer extends DOMWidgetView {
  render(): void {
    this.el.classList.add('custom-widget');
    this.el.classList.add('maximizing-widget');

    const component = React.createElement(ImageViewerWidget, {
      model: this.model,
    });
    ReactDOM.render(component, this.el);
  }
}

export type ImageViewerModelState = typeof defaultImageViewerModelState;

export class ImageViewerModel extends DOMWidgetModel {
  static view_name = 'ImageViewer'; // Set to null if no view
  static model_name = 'ImageViewerModel';

  defaults() {
    return {
      ...super.defaults(),
      _model_name: ImageViewerModel.model_name,
      _model_module: MODULE_NAME,
      _model_module_version: MODULE_VERSION,
      _view_name: ImageViewerModel.view_name,
      _view_module: MODULE_NAME,
      _view_module_version: MODULE_VERSION,
      ...defaultImageViewerModelState,
    };
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    _data: { deserialize: deserialize_bytes },
    _transform: {
      deserialize: (t: Array<number>): Transform => {
        return { center: new Point(t[0], t[1]), zoom: t[2] };
      },
      serialize: (t: Transform): Array<number> => [
        t.center.x,
        t.center.y,
        t.zoom,
      ],
    },
    _size: {
      deserialize: (p: Array<number>): Point => new Point(p[0], p[1]),
      serialize: (p: Point): Array<number> => [p.x, p.y],
    },
  };
}

function deserialize_bytes(value: DataView): any {
  const decoder = new TextDecoder('ascii');
  return decoder.decode(value);
}

/**
 *
 * @param name property name in the Python model object.
 * @returns model state and set state function.
 */
export function useModelState<T extends keyof ImageViewerModelState>(
  name: T
): [
  ImageViewerModelState[T],
  (val: ImageViewerModelState[T], options?: any) => void
] {
  const model = useModel();
  const [state, setState] = useState<ImageViewerModelState[T]>(
    model?.get(name)
  );

  useModelEvent(
    `change:${name}`,
    (model) => {
      setState(model.get(name));
    },
    [name]
  );

  function updateModel(val: ImageViewerModelState[T], options?: any) {
    model?.set(name, val, options);
    model?.save_changes();
  }

  return [state, updateModel];
}
