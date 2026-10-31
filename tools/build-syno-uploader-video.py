#!/usr/bin/env python3
"""Build the uploader close-up from capture-syno-uploader.mjs: the 3x crop stays pixel for pixel on the page tone."""
from __future__ import annotations

from pathlib import Path
import json

from PIL import Image

from syno_film import FPS, HEIGHT, WIDTH, Film, ease

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets-syno-case/films/source-uploader"
DEST = ROOT / "assets-syno-case/films"
BG = (229, 228, 226)


def main() -> None:
    t = json.loads((SRC / "timeline.json").read_text())
    clip = t["clip"]
    k = 3
    w, h = clip["width"] * k, clip["height"] * k
    ox, oy = (WIDTH - w) // 2, (HEIGHT - h) // 2
    cache: dict[str, Image.Image] = {}

    def img(name: str) -> Image.Image:
        if name not in cache:
            c = Image.new("RGB", (WIDTH, HEIGHT), BG)
            c.paste(Image.open(SRC / f"{name}.png").convert("RGB"), (ox, oy))
            cache[name] = c
        return cache[name]

    def pt(p: dict) -> tuple[float, float]:
        return (p["x"] - clip["x"]) * k + ox, (p["y"] - clip["y"]) * k + oy

    f = Film(DEST / "syno-flow-uploader.mp4")
    cur, ptr = None, None
    for op in t["ops"]:
        kind = op["op"]
        if kind == "start":
            ptr = pt(op["pos"])
        elif kind == "base":
            cur = img(op["img"])
        elif kind == "hold":
            f.hold(cur, op["hold"], ptr)
        elif kind == "move":
            b = pt(op["to"])
            hov = img(op["img"])
            f.move(cur, ptr, b, op["dur"], swap=(0.8, hov))
            ptr, cur = b, hov
        elif kind == "click":
            f.click(cur, ptr)
        elif kind == "fade":
            b = img(op["img"])
            f.fade(cur, b, op["dur"], ptr)
            cur = b
        elif kind == "frames":
            for name in op["imgs"]:
                cur = img(name)
                for _ in range(op["each"]):
                    f.emit(cur, ptr)
    cur.save(DEST / "syno-flow-uploader-poster.jpg", quality=92, subsampling=0)
    f.close()


if __name__ == "__main__":
    main()
