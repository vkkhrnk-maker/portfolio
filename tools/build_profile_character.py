#!/usr/bin/env python3
"""Build theme-matched opaque static profile plates."""

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


def connected_background(dark: Image.Image, light: Image.Image) -> np.ndarray:
    """Find the backdrop from what changes between the two matched renders."""
    dark_pixels = np.asarray(dark.convert("RGB"), dtype=np.int16)
    light_pixels = np.asarray(light.convert("RGB"), dtype=np.int16)
    difference = np.max(np.abs(dark_pixels - light_pixels), axis=2)

    # The generated character stays nearly identical between themes, while the
    # background changes by more than 200 levels. Flood filling keeps any rare
    # high-difference details inside the character out of the background mask.
    candidate = difference > 205
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


def build_variant(config: dict[str, object], background_mask: np.ndarray) -> None:
    source = Image.open(config["source"]).convert("RGB")
    pixels = np.asarray(source).copy()
    pixels[background_mask] = config["background"]
    result = Image.fromarray(pixels).resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
    result.save(config["output"], optimize=True)
    print(f"Built {Path(config['output']).relative_to(ROOT)} ({OUTPUT_SIZE[0]}x{OUTPUT_SIZE[1]}, RGB)")


def main() -> None:
    dark = Image.open(VARIANTS["dark"]["source"]).convert("RGB")
    light = Image.open(VARIANTS["light"]["source"]).convert("RGB")
    background_mask = connected_background(dark, light)
    for config in VARIANTS.values():
        build_variant(config, background_mask)


if __name__ == "__main__":
    main()
