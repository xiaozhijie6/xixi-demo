# -*- coding: utf-8 -*-
"""Deprecated. Use: python tools/gen_images.py warm"""
import sys
from pathlib import Path
sys.argv = [sys.argv[0], 'warm']
import runpy
runpy.run_path(str(Path(__file__).resolve().parent / 'tools' / 'gen_images.py'), run_name='__main__')
