import { WidgetModel } from '@jupyter-widgets/base';
import { createContext, DependencyList, useContext, useEffect } from 'react';

export const WidgetModelContext = createContext<WidgetModel | undefined>(
  undefined
);

// TYPES AND INTERFACES
//============================================================================================

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

/**
 * An escape hatch in case you want full access to the model.
 * @returns Python model
 */
export function useModel(): WidgetModel | undefined {
  return useContext(WidgetModelContext);
}
