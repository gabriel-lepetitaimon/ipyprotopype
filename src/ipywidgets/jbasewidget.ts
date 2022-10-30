import {
  DOMWidgetModel,
  DOMWidgetView,
  WidgetModel,
} from '@jupyter-widgets/base';
import {
  createContext,
  DependencyList,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Application } from '@phosphor/application';
import { Widget } from '@phosphor/widgets';
import { MODULE_NAME, MODULE_VERSION } from '../version';

//=========================================================================
//          ---   jupyter app initialization  ---
//=========================================================================

let _jApp: Application<Widget> | undefined = undefined;

export function initializeJApp(app: Application<Widget>): void {
  _jApp = app;
}

//=========================================================================
//          ---   JBaseWidget  ---
//=========================================================================

export class JBaseWidget extends DOMWidgetView {
  static jApp(): Application<Widget> | undefined {
    return _jApp;
  }

  send_event(name: string, data: { [key: string]: any }): void {
    this.send({ event: name, data: data });
  }
}

//=========================================================================
//          ---   JModel  ---
//=========================================================================

export class JModel extends DOMWidgetModel {
  protected view_name = 'JBaseWidget';
  protected model_name = 'JBaseWidget_Model';

  defaults(): any {
    return {
      ...super.defaults(),
      _model_name: this.model_name,
      _model_module: MODULE_NAME,
      _model_module_version: MODULE_VERSION,
      _view_name: this.view_name,
      _view_module: MODULE_NAME,
      _view_module_version: MODULE_VERSION,
      ...this.defaultState,
    };
  }

  get defaultState(): any {
    return {};
  }
}

export const WidgetModelContext = createContext<WidgetModel | undefined>(
  undefined
);

/**
 * An escape hatch in case you want full access to the model.
 * @returns Python model
 */
export function useModel(): WidgetModel | undefined {
  return useContext(WidgetModelContext);
}

interface ModelCallback {
  (model: WidgetModel, event: Backbone.EventHandler): void;
}

/**
 * Subscribes a listener to the model event loop.
 * @param event String identifier of the event that will trigger the callback.
 * @param callback Action to perform when event happens.
 * @param deps Dependencies that should be kept up to date within the callback.
 */
export function useModelEvent(
  event: string,
  callback: ModelCallback,
  deps?: DependencyList | undefined
): void {
  const model = useModel();

  const dependencies = deps === undefined ? [model] : [...deps, model];
  useEffect(() => {
    const callbackWrapper = (e: Backbone.EventHandler) =>
      model && callback(model, e);
    model?.on(event, callbackWrapper);
    return () => void model?.unbind(event, callbackWrapper);
  }, dependencies);
}

export function createUseModelState<T>() {
  return <K extends keyof T>(
    name: K
  ): [T[K], (val: T[K], options?: any) => void] => {
    const model = useModel();
    const [state, setState] = useState<T[K]>(model?.get(name as string));

    useModelEvent(
      `change:${name}`,
      (model) => {
        setState(model.get(name as string));
      },
      [name]
    );

    function updateModel(val: T[K], options?: any) {
      model?.set(name, val, options);
      model?.save_changes();
    }

    return [state, updateModel];
  };
}
