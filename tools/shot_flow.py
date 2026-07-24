# -*- coding: utf-8 -*-
"""Walk through v4-flow.html 5 steps, screenshot each, check errors/overflow."""
from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
URL = (ROOT / "demo" / "concerns" / "v4-flow.html").as_uri()
OUT = ROOT / "shots" / "concerns"
OUT.mkdir(parents=True, exist_ok=True)


def overflow(page):
    return page.evaluate(
        """() => {
          const p = document.querySelector('.page');
          if (!p) return 'no-page';
          const rows = p.querySelector('.list');
          const r = rows ? rows.getBoundingClientRect() : null;
          const foot = document.querySelector('.foot').getBoundingClientRect();
          const stage = document.querySelector('.stage').getBoundingClientRect();
          return (r ? (r.bottom <= foot.top + 2 && r.bottom <= stage.bottom) : true);
        }"""
    )


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge")
        page = browser.new_page(viewport={"width": 430, "height": 900}, device_scale_factor=2)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.goto(URL)
        page.wait_for_timeout(1600)
        page.screenshot(path=str(OUT / "f1.png"))
        print("step1 overflow-ok:", overflow(page))
        # 选 3 项 + 超选 1 项
        page.evaluate("document.querySelectorAll('.row').forEach((el,i)=>{if(i<4)el.click()})")
        page.wait_for_timeout(700)
        page.screenshot(path=str(OUT / "f1-sel.png"))
        n = page.evaluate("document.querySelectorAll('.row.on').length")
        print("step1 sel4->on:", n)
        page.click("#cta")
        page.wait_for_timeout(500)
        page.screenshot(path=str(OUT / "f-mid-wipe.png"))  # 划场中途
        page.wait_for_function("document.getElementById('stepNo').textContent==='02'", timeout=6000)
        page.wait_for_timeout(1700)
        page.screenshot(path=str(OUT / "f2.png"))
        print("step2 overflow-ok:", overflow(page))
        page.evaluate("document.querySelectorAll('.row').forEach((el,i)=>{if(i<2)el.click()})")
        page.wait_for_timeout(300)
        page.click("#cta")
        page.wait_for_function("document.getElementById('stepNo').textContent==='03'", timeout=6000)
        page.wait_for_timeout(1700)
        page.screenshot(path=str(OUT / "f3.png"))
        print("step3 overflow-ok:", overflow(page))
        page.evaluate("document.querySelectorAll('.row')[1].click()")
        page.wait_for_function("document.getElementById('stepNo').textContent==='04'", timeout=6000)
        page.wait_for_timeout(1700)
        page.screenshot(path=str(OUT / "f4.png"))
        print("step4 overflow-ok:", overflow(page))
        page.evaluate("document.querySelectorAll('.row')[2].click()")
        page.wait_for_function("document.getElementById('stepNo').textContent==='05'", timeout=6000)
        page.wait_for_timeout(1700)
        page.screenshot(path=str(OUT / "f5.png"))
        page.fill("#nm", "阿黎")
        page.wait_for_timeout(300)
        page.click("#cta")
        page.wait_for_timeout(1600)
        page.screenshot(path=str(OUT / "f-mid-env.png"))  # 信封居中
        page.wait_for_timeout(3200)
        page.screenshot(path=str(OUT / "f6-done.png"))
        print("done visible:", page.evaluate("document.getElementById('done').classList.contains('on')"))
        browser.close()
    if errors:
        print("JS ERRORS:", *errors, sep="\n  ")
    else:
        print("NO JS ERRORS")
    print("FLOW DONE")


if __name__ == "__main__":
    main()
