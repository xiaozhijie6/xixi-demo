# -*- coding: utf-8 -*-
"""MutationObserver: log s-launch class changes."""
from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
URL = (ROOT / "demo" / "index.html").as_uri()

INIT = """
window.__log=[];
document.addEventListener('DOMContentLoaded',()=>{
  const s=document.getElementById('s-launch');
  window.__log.push({t:0, init:s.className});
  new MutationObserver(muts=>{
    muts.forEach(m=>window.__log.push({
      t:Math.round(performance.now()),
      from:m.oldValue,
      to:s.className,
      stack:new Error().stack.split('\\n').slice(1,4).join(' | ')
    }));
  }).observe(s,{attributes:true,attributeFilter:['class'],attributeOldValue:true});
});
"""


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge")
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.add_init_script(INIT)
        page.goto(URL)
        page.wait_for_timeout(1200)
        for row in page.evaluate("window.__log"):
            print(row)
        browser.close()
    print("DONE")


if __name__ == "__main__":
    main()
