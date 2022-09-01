#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Gabriel Lepetit-Aimon.
# Distributed under the terms of the Modified BSD License.

import cv2
import numpy as np
import base64

"""
TODO: Add module docstring
"""

from ipywidgets import DOMWidget
from traitlets import Bool, Bytes, Float, Int, Tuple, Unicode
from ._frontend import BaseI3PWidget


class ImageViewer(BaseI3PWidget):
    """TODO: Add docstring here
    """

    # Your widget state goes here. Make sure to update the corresponding
    # JavaScript widget state (defaultModelProperties) in widgets.ts
    _data = Bytes(b'data:image/png;base64,'
                  b'BORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVQIHWNgAAAAAgABz8g15QAAAABJRU5ErkJggg='
                ).tag(sync=True, )
    _size = Tuple(trait=(int, int)).tag(sync=True)
    _transform = Tuple((0, 0, 1e-8), trait=(float, float, float)).tag(sync=True)
    linkedTransform = Bool(False).tag(sync=True)

    def goto(self, pos, scale=None):
        if scale is None:
            scale = self._transform[-1]
        self._transform = (pos[0], pos[1], scale)

    @property
    def image(self):
        return None

    @image.setter
    def image(self, img):
        png = ImageViewer._img2url(img)
        self.png = png
        self._data = png
        self._size = img.shape[-2:]

    @staticmethod
    def _img2url(img, normalize=False, normalize_img=None, thumbnail=None, keep_ratio=True, format='png'):
        if len(img.shape) == 3:
            img = img.transpose((1, 2, 0))
            if img.shape[2] == 1:
                img = img[:, :, 0]

        if normalize_img is None:
            normalize_img = img

        if np.max(normalize_img) <= 1. and np.min(normalize_img) >= 0 and not normalize:
            img = img * 255.
        elif np.max(normalize_img) < 20:
            normalize = True

        if normalize:
            img = img - np.min(normalize_img)
            img = img / (np.max(normalize_img) - np.min(normalize_img)) * 255.

        if thumbnail is not None:
            if keep_ratio:
                if len(img.shape) == 2:
                    h, w = img.shape
                else:
                    h, w, l = img.shape
                ratio = h / w
                mindim = min(thumbnail[0] * ratio, thumbnail[1])
                thumbnail = (round(mindim / ratio), round(mindim))
            img = cv2.resize(img, thumbnail, interpolation=cv2.INTER_AREA)

        header = f'data:image/{format};base64,'.encode('ascii')
        data = base64.b64encode(cv2.imencode('.'+format, img)[1])
        return header + data
