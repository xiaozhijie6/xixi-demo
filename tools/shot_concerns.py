# -*- coding: utf-8 -*-
"""Screenshot all concerns versions + overflow/interaction checks."""
from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / "demo" / "concerns"
OUT = ROOT / "shots" / "concerns"
OUT.mkdir(parents=True, exist_ok=True)

PAGES = ["v1", "v2", "v3", "v4", "v5", "v6"]


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge")
        page = browser.new_page(viewport={"width": 430, "height": 900}, device_scale_factor=2)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        for name in PAGES:
            page.goto((BASE / f"{name}.html").as_uri())
            page.wait_for_timeout(2200)
            info = page.evaluate(
                """() => {
                  const st = document.querySelector('.stage');
                  const r = st.getBoundingClientRect();
                  let over = [];
                  document.querySelectorAll('.wrap, .sheet').forEach(el => {
                    if (el.scrollHeight > el.clientHeight + 2) over.push(el.className + ':' + el.scrollHeight + '>' + el.clientHeight);
                  });
                  const cta = document.querySelector('.cta').getBoundingClientRect();
                  return {stageH: r.height, ctaBottom: Math.round(cta.bottom - r.top), over,
                          docScroll: document.documentElement.scrollHeight};
                }"""
            )
            page.screenshot(path=str(OUT / f"{name}.png"))
            # 交互：连点 4 个选项，验证最多 3 个
            page.evaluate("document.querySelectorAll('.opt,.row,.bub,.tile').forEach((el,i)=>{if(i<4)el.click()})")
            page.wait_for_timeout(600)
            n_on = page.evaluate("document.querySelectorAll('.on').length")
            n_hidden = page.evaluate(
                "[...document.querySelectorAll('.opt,.row,.bub,.tile')].filter(e=>+getComputedStyle(e).opacity<0.1).length"
            )
            cta_txt = page.evaluate("document.querySelector('#cta').textContent")
            page.screenshot(path=str(OUT / f"{name}-sel.png"))
            print(
                f"{name}: stage={info['stageH']} ctaBottom={info['ctaBottom']} "
                f"overflow={info['over'] or '无'} sel4→on={n_on} hidden={n_hidden} cta='{cta_txt.strip()}'",
                flush=True,
            )
        # 画廊
        page.set_viewport_size({"width": 1600, "height": 1000})
        page.goto((BASE / "index.html").as_uri())
        page.wait_for_timeout(3000)
        page.screenshot(path=str(OUT / "gallery.png"))
        browser.close()
    if errors:
        print("JS ERRORS:", *errors, sep="\n  ")
    print("ALL DONE")


if __name__ == "__main__":
    main()
