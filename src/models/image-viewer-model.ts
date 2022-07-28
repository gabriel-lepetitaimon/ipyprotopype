import { DOMWidgetModel, ISerializers } from '@jupyter-widgets/base';
import { MODULE_NAME, MODULE_VERSION } from '../version';
import { useState } from 'react';
import { useModel, useModelEvent } from './model';
import { ORIGIN, Point } from '../utils/point';
import { Transform } from '../utils/zoom-pan-handler';

// import { JupyterLab } from '@jupyterlab/application';

// Your widget state goes here. Make sure to update the corresponding
// Python state in viewer.py

const defaultImageViewerModelState = {
  _data: 'default',
  _size: ORIGIN,
  linkedTransform: false,
  center: ORIGIN,
  scale: 0,
};

export type ImageViewerModelState = typeof defaultImageViewerModelState;

export class ImageViewerModel extends DOMWidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: ImageViewerModel.model_name,
      _model_module: ImageViewerModel.model_module,
      _model_module_version: ImageViewerModel.model_module_version,
      _view_name: ImageViewerModel.view_name,
      _view_module: ImageViewerModel.view_module,
      _view_module_version: ImageViewerModel.view_module_version,
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

  static model_name = 'ImageViewerModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'ImageViewer'; // Set to null if no view
  static view_module = MODULE_NAME; // Set to null if no view
  static view_module_version = MODULE_VERSION;
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
