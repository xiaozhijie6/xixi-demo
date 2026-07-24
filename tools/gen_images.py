# -*- coding: utf-8 -*-
"""Unified image generation for demo assets.

Usage:
  set AN520_API_KEY=sk-...
  python tools/gen_images.py          # all jobs
  python tools/gen_images.py warm     # avatar-ai + card-sleep
  python tools/gen_images.py goods    # goods 1-4
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

BASE_JOBS = [
    ("bg-launch", "1024x1536",
     "Dreamy serene vertical background for a women's emotional wellness app: soft diffuse gradient flowing from warm cream at top through blush pink to gentle lavender purple at bottom, floating soft light bokeh orbs, a few delicate translucent flower petals drifting, ethereal morning light, ultra soft, minimalist, no text, no people, healing and warm atmosphere"),
    ("bg-home", "1024x1536",
     "Very soft vertical gradient background: warm cream white at top melting into pale peach pink, subtle warm sun glow in upper right corner, extremely soft and clean, minimalist wellness app background, no text, no objects, airy and calm"),
    ("avatar-c1", "1024x1024",
     "Professional headshot portrait of a Chinese woman around 40 years old, psychologist counselor: warm confident smile, shoulder-length black hair, elegant beige blazer, soft diffused studio lighting, clean warm cream background, upper body, photorealistic, trustworthy and gentle, square format"),
    ("avatar-c2", "1024x1024",
     "Professional headshot portrait of a Chinese woman around 35 years old, family therapist: gentle soft smile, long dark hair loosely tied, dusty rose knitted sweater, warm natural window light, soft pale pink background, upper body, photorealistic, approachable and kind, square format"),
    ("avatar-c3", "1024x1024",
     "Professional headshot portrait of a Chinese woman around 45 years old, senior marriage counselor: calm wise expression with slight smile, short elegant hair, thin frame glasses, dark green silk blouse, soft studio light, warm light gray background, upper body, photorealistic, experienced and composed, square format"),
    ("card-daily", "1536x1024",
     "Warm minimalist still life photograph: a ceramic vase with dried pampas grass and blush roses on a linen-covered table, soft golden morning sunlight casting gentle shadows, cream and warm beige tones, shallow depth of field, serene feminine aesthetic, landscape, no text"),
    ("card-member", "1536x1024",
     "Luxurious abstract background: flowing rose gold and blush pink silk fabric texture with soft folds and gentle sheen, subtle golden light streaks, elegant premium membership card vibe, smooth gradient, landscape, no text"),
]

WARM_JOBS = [
    ("avatar-ai", "1024x1024",
     "A glowing translucent glass orb character avatar floating centered on a very pale blush cream background: the orb has a soft warm rose-pink to dusty mauve gradient swirling inside, gentle warm inner glow, two small soft glowing oval eyes that feel serene and kind, subtle warm light reflections on the glass surface, cute minimalist AI companion mascot, clean composition, square format, no text, warm color palette only, no blue no purple"),
    ("card-sleep", "1536x1024",
     "Dreamy warm dusk night sky scene for a sleep-aid section: deep warm plum to dusty rose gradient sky, glowing golden crescent moon, scattered soft warm stars, silky translucent clouds tinted rose and amber, a few firefly light dots, extremely peaceful and quiet, minimalist illustration style with soft grain, landscape, no text, no people, warm color palette only, no blue tones"),
]

GOODS_JOBS = [
    ("goods-1", "1024x1024",
     "Minimalist product photo of an aromatherapy sleep-aid candle in an amber glass jar with a wooden lid, dried lavender sprigs beside it, warm soft light, cream beige background, premium wellness aesthetic, square, no text"),
    ("goods-2", "1024x1024",
     "Minimalist product photo of a folded dusty pink silk sleep eye mask on a soft linen surface, gentle morning light, pale warm background, premium elegant aesthetic, square, no text"),
    ("goods-3", "1024x1024",
     "Minimalist product photo of a herbal calming tea gift set: small kraft paper box with tea bags and a glass cup of amber tea, chamomile flowers scattered, warm cozy light, cream background, square, no text"),
    ("goods-4", "1024x1024",
     "Minimalist product photo of a small round white noise machine in matte cream color on a bedside table, soft warm lamp glow in background, calm night atmosphere, premium aesthetic, square, no text"),
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


def select_jobs(mode: str):
    mode = (mode or "all").lower()
    if mode == "warm":
        return WARM_JOBS
    if mode == "goods":
        return GOODS_JOBS
    if mode == "base":
        return BASE_JOBS
    return BASE_JOBS + WARM_JOBS + GOODS_JOBS


def main():
    if not API_KEY:
        print("Missing AN520_API_KEY env var. Example:")
        print('  set AN520_API_KEY=sk-...')
        print("  python tools/gen_images.py")
        sys.exit(1)
    jobs = select_jobs(sys.argv[1] if len(sys.argv) > 1 else "all")
    workers = min(4, len(jobs))
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for name, st in ex.map(lambda j: gen(*j), jobs):
            print(name, "->", st, flush=True)
    print("DONE")


if __name__ == "__main__":
    main()
