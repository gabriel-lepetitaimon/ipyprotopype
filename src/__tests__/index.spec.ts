// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Add any needed widget imports here (or from controls)
// import {} from '@jupyter-ipywidgets/base';

import { createTestModel } from './utils';

import { JImageViewerModel } from '..';

describe('Example', () => {
  describe('ExampleModel', () => {
    it('should be createable', () => {
      const model = createTestModel(JImageViewerModel);
      expect(model).toBeInstanceOf(JImageViewerModel);
      expect(model.get('value')).toEqual('Hello World');
    });

    it('should be createable with a value', () => {
      const state = { value: 'Foo Bar!' };
      const model = createTestModel(JImageViewerModel, state);
      expect(model).toBeInstanceOf(JImageViewerModel);
      expect(model.get('value')).toEqual('Foo Bar!');
    });
  });
});
