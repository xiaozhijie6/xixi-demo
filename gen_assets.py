# -*- coding: utf-8 -*-
"""Deprecated. Use: python tools/gen_images.py"""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).resolve().parent / 'tools' / 'gen_images.py'), run_name='__main__')
