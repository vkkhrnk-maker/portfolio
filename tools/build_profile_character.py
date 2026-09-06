#!/usr/bin/env python3
"""Build theme-matched opaque profile images without alpha extraction."""

from pathlib import Path

import numpy as np
from PIL import Image


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


def blend_plate_edges(image: Image.Image, background: tuple[int, int, int]) -> Image.Image:
    """Match the outer plate to the page without classifying dark clothing as background."""
    pixels = np.asarray(image.convert("RGB"), dtype=np.float32)
    height, width = pixels.shape[:2]
    y, x = np.ogrid[:height, :width]
    edge_distance = np.minimum.reduce(
        np.broadcast_arrays(x, y, width - 1 - x, height - 1 - y)
    ).astype(np.float32)

    # Keep a solid theme-coloured rim, then ease into the untouched render.
    # The character is comfortably outside this narrow edge zone.
    blend = 1.0 - np.clip((edge_distance - 8.0) / 40.0, 0.0, 1.0)
    target = np.asarray(background, dtype=np.float32)
    pixels = pixels * (1.0 - blend[..., None]) + target * blend[..., None]
    return Image.fromarray(np.rint(pixels).astype(np.uint8))


def build_variant(config: dict[str, object]) -> None:
    source = Image.open(config["source"]).convert("RGB")
    result = blend_plate_edges(source, config["background"])
    result = result.resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
    result.save(config["output"], optimize=True)
    print(f"Built {Path(config['output']).relative_to(ROOT)} ({OUTPUT_SIZE[0]}x{OUTPUT_SIZE[1]}, RGB)")


def main() -> None:
    for config in VARIANTS.values():
        build_variant(config)


if __name__ == "__main__":
    main()
