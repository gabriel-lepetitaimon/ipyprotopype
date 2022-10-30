#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Gabriel Lepetit-Aimon.
# Distributed under the terms of the Modified BSD License.

from ipywidgets import DOMWidget
from traitlets import Unicode, Int

"""
Information about the frontend package of the ipywidgets.
"""

module_name = "ipyprotopypes"
module_version = "^0.1.0"

class BaseI3PWidget(DOMWidget):
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _model_name = Unicode(f'MODEL_NAME').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode(f'VIEW_NAME').tag(sync=True)
    _instance_id = Int(f'VIEW_NAME').tag(sync=True)

    __last_instance_id = 0

    def __new__(cls):
        cls_name = cls.__name__
        cls._model_name.default_value = f'{cls_name}Model'
        cls._view_name.default_value = cls_name
        cls._instance_id.default_value = cls.__last_instance_id
        cls.__last_instance_id += 1
        return super().__new__(cls)

    def __init__(self):
        super(BaseI3PWidget, self).__init__()
        self.on_msg(self._on_custom_msg_received)

    def _on_custom_msg_received(self, widget, content, buffer):
        if content.get('event', None) and isinstance(content.get('data', None), dict):
            self.on_events(content['event'], content['data'])

    def on_events(self, event, data):
        pass
