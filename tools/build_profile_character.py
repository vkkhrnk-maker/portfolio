#!/usr/bin/env python3
"""Build one clean transparent profile character from a single master."""

from pathlib import Path

from PIL import Image

from build_wave_animation import (
    HEIGHT,
    WEB_HEIGHT,
    WEB_WIDTH,
    WIDTH,
    defringe,
    foreground_mask,
    remove_light_matte,
    strip_sealed_backdrop,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/hero-wave-frames/viktoria-profile-master-v8.png"
OUTPUT = ROOT / "assets/viktoria-profile-single-v8.png"


def main() -> None:
    source = Image.open(SOURCE).resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS).convert("RGB")
    alpha = strip_sealed_backdrop(foreground_mask(source), source)

    figure = defringe(source, alpha, band_base=7.0).convert("RGBA")
    figure.putalpha(alpha)
    figure = figure.resize((WEB_WIDTH, WEB_HEIGHT), Image.Resampling.LANCZOS)
    figure = remove_light_matte(figure, 1, 6.0, 120.0, 85.0)
    figure.save(OUTPUT, optimize=True)

    print(f"Built {OUTPUT.relative_to(ROOT)} ({WEB_WIDTH}x{WEB_HEIGHT}, RGBA)")


if __name__ == "__main__":
    main()
