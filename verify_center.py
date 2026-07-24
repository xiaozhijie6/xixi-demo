# -*- coding: utf-8 -*-
"""Deprecated. Use: python tools/verify_center.py"""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).resolve().parent / 'tools' / 'verify_center.py'), run_name='__main__')
