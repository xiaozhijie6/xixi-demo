# -*- coding: utf-8 -*-
"""Capture home-3d-variants gallery + H phone expression states."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
URL = (ROOT / "demo" / "home-3d-variants.html").as_uri()
OUT = ROOT / "shots"

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge")
    page = browser.new_page(viewport={"width": 1440, "height": 1080}, device_scale_factor=1.5)
    page.goto(URL)
    page.wait_for_timeout(2200)
    page.screenshot(path=str(OUT / "home-3d-variants.png"), full_page=True)
    # H 手机区域
    h = page.locator(".phone.vh")
    # 戳西西 → 惊讶表情
    page.click("#xxsH")
    page.wait_for_timeout(400)
    h.screenshot(path=str(OUT / "home-3d-h-wow.png"))
    page.wait_for_timeout(1200)
    # 打卡 → 爱心表情
    page.click(".phone.vh .c-moods .m[data-m='平静']")
    page.wait_for_timeout(400)
    h.screenshot(path=str(OUT / "home-3d-h-love.png"))
    browser.close()
print("done")
