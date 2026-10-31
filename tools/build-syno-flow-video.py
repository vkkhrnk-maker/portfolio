#!/usr/bin/env python3
"""Build a case film from a captured flow: python3 tools/build-syno-flow-video.py <flow> <out-stem>.

Every state is a browser capture from capture-syno-flow.mjs; this only sequences them,
draws the pointer on desktop and a touch mark on phones.
"""
from __future__ import annotations

from pathlib import Path
import json
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter

from syno_film import FPS, ease, pointer

ROOT = Path(__file__).resolve().parents[1]
FILMS = ROOT / "assets-syno-case/films"


def main() -> None:
    flow, stem = sys.argv[1], sys.argv[2]
    src = FILMS / f"source-flow-{flow}"
    t = json.loads((src / "timeline.json").read_text())
    mobile = t["mobile"]
    W, H = (750, 1624) if mobile else (1920, 1200)
    k = W / t["view"][0]
    cache: dict[str, Image.Image] = {}

    def img(name: str) -> Image.Image:
        if name not in cache:
            im = Image.open(src / f"{name}.png").convert("RGB")
            if im.size != (W, H):
                im = im.resize((W, H), Image.Resampling.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1, percent=60, threshold=2))
            cache[name] = im
        return cache[name]

    out = FILMS / f"{stem}.mp4"
    p = subprocess.Popen(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                          "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "slow",
                          "-tune", "stillimage", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out)],
                         stdin=subprocess.PIPE)
    frames = 0
    cur, ptr = None, None

    def emit(frame: Image.Image, pulse: float = 0.0) -> None:
        nonlocal frames
        f = frame
        if ptr and not mobile:
            f = frame.copy()
            pointer(f, ptr[0], ptr[1], pulse)
        p.stdin.write(f.tobytes())
        frames += 1

    def ripple(frame: Image.Image, at, phase: float) -> Image.Image:
        f = frame.copy()
        d = ImageDraw.Draw(f, "RGBA")
        r = 16 + 18 * phase
        d.ellipse((at[0] - r, at[1] - r, at[0] + r, at[1] + r), outline=(44, 120, 178, round(210 * (1 - phase))), width=4)
        d.ellipse((at[0] - 6, at[1] - 6, at[0] + 6, at[1] + 6), fill=(44, 120, 178, 150))
        return f

    for op in t["ops"]:
        kind = op["op"]
        if kind == "start":
            ptr = (op["pos"]["x"] * k, op["pos"]["y"] * k) if op.get("pos") else None
        elif kind == "base":
            cur = img(op["img"])
        elif kind == "hold":
            for _ in range(round(op["hold"] * FPS)):
                emit(cur)
        elif kind == "fade":
            b = img(op["img"])
            n = max(1, round(op["dur"] * FPS))
            for i in range(n):
                emit(Image.blend(cur, b, ease((i + 1) / n)))
            cur = b
        elif kind == "move":
            a, b = ptr, (op["to"]["x"] * k, op["to"]["y"] * k)
            n = max(1, round(op["dur"] * FPS))
            hov = img(op["img"])
            for i in range(n):
                q = ease((i + 1) / n)
                ptr = (a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q)
                emit(hov if q > 0.8 else cur)
            cur = hov
        elif kind == "click":
            n = round(0.18 * FPS)
            for i in range(n):
                emit(cur, ease((i + 1) / n))
        elif kind == "tap":
            at = (op["at"]["x"] * k, op["at"]["y"] * k)
            n = round(0.3 * FPS)
            for _ in range(round(0.25 * FPS)):
                emit(cur)
            for i in range(n):
                emit(ripple(cur, at, (i + 1) / n))
        elif kind == "frames":
            for name in op["imgs"]:
                cur = img(name)
                for _ in range(op["each"]):
                    emit(cur)
    p.stdin.close()
    if p.wait() != 0:
        raise RuntimeError("ffmpeg failed")
    print(f"{out} ({frames / FPS:.2f}s)")


if __name__ == "__main__":
    main()
