import { DOMWidgetView } from '@jupyter-widgets/base';
import React from 'react';
import ImageViewerWidget from '../components/ImageViewerWidget';
import ReactDOM from 'react-dom';

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
