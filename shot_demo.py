# -*- coding: utf-8 -*-
"""Deprecated. Use: python tools/shot_demo.py"""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).resolve().parent / 'tools' / 'shot_demo.py'), run_name='__main__')
