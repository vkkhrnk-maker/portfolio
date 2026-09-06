#!/usr/bin/env python3
"""Build theme-matched opaque profile images without alpha extraction."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_SIZE = (480, 1012)
VARIANTS = {
    "dark": {
        "source": ROOT / "assets/hero-wave-frames/viktoria-profile-dark-master-v10.png",
        "output": ROOT / "assets/viktoria-profile-dark-v10.png",
        "background": (19, 19, 22),
    },
    "light": {
        "source": ROOT / "assets/hero-wave-frames/viktoria-profile-light-master-v10.png",
        "output": ROOT / "assets/viktoria-profile-light-v10.png",
        "background": (240, 240, 240),
    },
}


def connected_background(image: Image.Image, theme: str) -> np.ndarray:
    pixels = np.asarray(image.convert("RGB")).astype(np.int16)
    brightness = pixels.mean(axis=2)
    spread = pixels.max(axis=2) - pixels.min(axis=2)

    if theme == "dark":
        candidate = (brightness < 100) & (spread < 18)
    else:
        candidate = (brightness > 160) & (spread < 18)

    flood_map = Image.fromarray(np.where(candidate, 0, 255).astype(np.uint8)).copy()
    for seed in (
        (0, 0),
        (flood_map.width - 1, 0),
        (0, flood_map.height - 1),
        (flood_map.width - 1, flood_map.height - 1),
    ):
        if flood_map.getpixel(seed) == 0:
            ImageDraw.floodfill(flood_map, seed, 128, thresh=0)
    return np.asarray(flood_map) == 128


def build_variant(theme: str, config: dict[str, object]) -> None:
    source = Image.open(config["source"]).convert("RGB")
    pixels = np.asarray(source).copy()
    pixels[connected_background(source, theme)] = config["background"]

    result = Image.fromarray(pixels, "RGB").resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
    result.save(config["output"], optimize=True)
    print(f"Built {Path(config['output']).relative_to(ROOT)} ({OUTPUT_SIZE[0]}x{OUTPUT_SIZE[1]}, RGB)")


def main() -> None:
    for theme, config in VARIANTS.items():
        build_variant(theme, config)


if __name__ == "__main__":
    main()
