# -*- coding: utf-8 -*-
"""Capture demo screenshots into shots/ (excluded from IDE indexing)."""
from __future__ import annotations

import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
URL = (ROOT / "demo" / "index.html").as_uri()
OUT = ROOT / "shots"
OUT.mkdir(exist_ok=True)

SHOTS = [
    ("s-launch", 1.5),
    ("s-home", 1.2),
    ("s-chat", 12.0),
    ("s-prediag", 1.8),
    ("s-report", 1.2),
    ("s-consultants", 1.2),
    ("s-cdetail", 1.2),
    ("s-sleep", 1.2),
    ("s-content", 1.2),
    ("s-me", 1.2),
]


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge")
        page = browser.new_page(viewport={"width": 1280, "height": 900}, device_scale_factor=2)
        page.goto(URL)
        page.wait_for_timeout(2500)
        for sid, wait in SHOTS:
            page.evaluate(f"go('{sid}')")
            page.wait_for_timeout(int(wait * 1000))
            page.screenshot(path=str(OUT / f"{sid}.png"))
            print("shot", sid, flush=True)
        page.evaluate("go('s-cdetail');openPay()")
        page.wait_for_timeout(900)
        page.screenshot(path=str(OUT / "s-pay.png"))
        print("shot s-pay", flush=True)
        page.evaluate("go('s-chat')")
        page.wait_for_timeout(300)
        page.evaluate("triggerCrisis()")
        page.wait_for_timeout(2200)
        page.screenshot(path=str(OUT / "s-crisis.png"))
        print("shot s-crisis", flush=True)
        browser.close()
    print("ALL SHOTS DONE")


if __name__ == "__main__":
    main()
