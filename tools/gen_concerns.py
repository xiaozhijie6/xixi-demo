# -*- coding: utf-8 -*-
"""Generate decorative assets for the concerns-picker versions (demo/concerns).

Usage:
  set AN520_API_KEY=sk-...
  python tools/gen_concerns.py
"""
from __future__ import annotations

import base64
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib import request

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets"
OUT.mkdir(exist_ok=True)

API_URL = os.environ.get("AN520_API_URL", "https://an520.xin/v1/images/generations")
API_KEY = os.environ.get("AN520_API_KEY", "").strip()

JOBS = [
    ("conc-paper", "1024x1536",
     "Warm cream handmade paper texture background, subtle visible paper fibers and gentle grain, very faint blush pink tint toward the bottom, soft even lighting, minimalist, no text, no objects, vertical, calm editorial stationery feel"),
    ("conc-night", "1024x1536",
     "Dreamy quiet night sky vertical illustration: deep warm plum and dusty indigo gradient, glowing golden crescent moon in upper area, scattered small soft stars, silky translucent clouds tinted rose and amber near the bottom, a few tiny firefly dots, extremely peaceful, soft grain, minimalist illustration, no text, no people, no buildings"),
    ("conc-hero", "1536x1024",
     "Warm cozy flat illustration with soft grain: a young Chinese woman with short hair wrapped in a cream blanket sitting on a dusty-rose sofa, holding a steaming cup of tea, a sleeping orange cat curled beside her, potted plants and a small round window with evening light behind, warm beige blush and terracotta palette, gentle healing atmosphere, no text, landscape composition with empty space at top"),
    ("conc-botanic", "1024x1024",
     "Delicate pressed botanical sprigs and dried flowers (eucalyptus, baby's breath, small blush roses) arranged loosely on a plain warm cream paper background, flat lay, soft natural light, muted dusty rose and sage palette, lots of empty cream space, minimalist, no text"),
    ("conc-sky", "1024x1536",
     "Soft pastel sky vertical background: gentle gradient from warm cream at top through pale blush pink to light peach at the bottom, a few fluffy translucent white clouds drifting, tiny soft sparkles, airy dreamy, extremely soft and clean, minimalist, no text, no people"),
    ("conc-spot-moon", "1024x1024",
     "Tiny cozy flat illustration spot art: a golden crescent moon resting on a soft cream pillow with two small stars around, warm blush and honey palette, plain warm cream background, soft grain, minimalist cute, centered with generous empty margin, no text"),
    ("conc-spot-tea", "1024x1024",
     "Tiny cozy flat illustration spot art: two ceramic cups of steaming tea side by side on a small wooden tray with a sprig of baby's breath, warm blush terracotta and cream palette, plain warm cream background, soft grain, minimalist cute, centered with generous empty margin, no text"),
    ("conc-letter", "1024x1024",
     "A vintage cream envelope sealed with dusty rose wax seal, a few dried flower petals and a small eucalyptus sprig beside it, on plain warm cream paper background, flat lay, soft warm light, muted romantic palette, generous empty space, minimalist, no text"),
    ("conc-dawn", "1024x1536",
     "High-key bright vertical background, very short tonal range and extremely low contrast: pale ivory white with whispers of blush pink and pale lavender, thin layers of soft white morning mist drifting, a few faint glowing light orbs, ethereal airy overexposed feel, minimalist, no text, no objects, no dark tones"),
]


def _to_webp(raw: bytes, dest: Path) -> None:
    from PIL import Image
    import io

    img = Image.open(io.BytesIO(raw)).convert("RGB")
    img.save(dest, "WEBP", quality=82, method=6)


def gen(name: str, size: str, prompt: str, retries: int = 3):
    dest = OUT / f"{name}.webp"
    if dest.exists() and dest.stat().st_size > 8000:
        return name, "skip(exists)"
    body = json.dumps(
        {"model": "gpt-image-2", "prompt": prompt, "size": size, "n": 1}
    ).encode()
    err = ""
    for i in range(retries):
        try:
            req = request.Request(
                API_URL,
                data=body,
                headers={
                    "Authorization": "Bearer " + API_KEY,
                    "Content-Type": "application/json",
                },
            )
            with request.urlopen(req, timeout=300) as r:
                data = json.loads(r.read().decode())
            item = data["data"][0]
            if item.get("b64_json"):
                raw = base64.b64decode(item["b64_json"])
            else:
                with request.urlopen(item["url"], timeout=120) as r2:
                    raw = r2.read()
            _to_webp(raw, dest)
            return name, "ok %dKB" % (dest.stat().st_size // 1024)
        except Exception as e:
            err = str(e)[:120]
            time.sleep(3 * (i + 1))
    return name, "FAIL " + err


def main():
    if not API_KEY:
        print("Missing AN520_API_KEY env var.")
        sys.exit(1)
    with ThreadPoolExecutor(max_workers=4) as ex:
        for name, st in ex.map(lambda j: gen(*j), JOBS):
            print(name, "->", st, flush=True)
    print("DONE")


if __name__ == "__main__":
    main()
