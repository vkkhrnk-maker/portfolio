#!/usr/bin/env python3
"""Build theme-matched opaque static and animated profile plates."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import map_coordinates


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_SIZE = (480, 1012)
WAVE_DURATION_MS = 100
WAVE_ANGLES = (
    0, 0, 0, 0, 0, 0,
    -3, -6, -8, -4, 2, 7, 9, 4, -2, -7, -8, -3, 3, 7, 5, 2, 0,
    0, 0, 0, 0, 0, 0, 0,
)
VARIANTS = {
    "dark": {
        "source": ROOT / "assets/hero-wave-frames/viktoria-profile-dark-master-v10.png",
        "output": ROOT / "assets/viktoria-profile-dark-v10.png",
        "animated_output": ROOT / "assets/viktoria-profile-dark-animated-v11.webp",
        "background": (19, 19, 22),
    },
    "light": {
        "source": ROOT / "assets/hero-wave-frames/viktoria-profile-light-master-v10.png",
        "output": ROOT / "assets/viktoria-profile-light-v10.png",
        "animated_output": ROOT / "assets/viktoria-profile-light-animated-v11.webp",
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


def wave_frame(image: Image.Image, angle_degrees: float, background: tuple[int, int, int]) -> Image.Image:
    """Rotate the intact hand around its wrist inside one opaque full frame."""
    pixels = np.asarray(image.convert("RGB"))
    output = pixels.copy()

    left, top, right, bottom = 34, 112, 226, 376
    pivot_x, pivot_y = 137.0, 363.0
    y, x = np.mgrid[top:bottom, left:right].astype(np.float32)

    theta = np.deg2rad(-angle_degrees)
    cos_theta, sin_theta = np.cos(theta), np.sin(theta)
    offset_x, offset_y = x - pivot_x, y - pivot_y
    rotated_x = pivot_x + cos_theta * offset_x - sin_theta * offset_y
    rotated_y = pivot_y + sin_theta * offset_x + cos_theta * offset_y

    # The hand moves rigidly; the last 44 px ease back to the fixed cuff so the
    # skin/cuff join stays closed instead of becoming a separate raster seam.
    wrist_weight = np.clip((bottom - y) / 44.0, 0.0, 1.0)
    left_weight = np.clip((x - left) / 12.0, 0.0, 1.0)
    right_weight = np.clip((200.0 - x) / 15.0, 0.0, 1.0)
    influence = wrist_weight * left_weight * right_weight
    map_x = x + (rotated_x - x) * influence
    map_y = y + (rotated_y - y) * influence

    coordinates = np.vstack((map_y.ravel(), map_x.ravel()))
    for channel, fill in enumerate(background):
        warped = map_coordinates(
            pixels[:, :, channel],
            coordinates,
            order=3,
            mode="constant",
            cval=fill,
            prefilter=True,
        ).reshape(bottom - top, right - left)
        output[top:bottom, left:right, channel] = np.clip(np.rint(warped), 0, 255).astype(np.uint8)

    return Image.fromarray(output)


def build_variant(config: dict[str, object], background_mask: np.ndarray) -> None:
    source = Image.open(config["source"]).convert("RGB")
    pixels = np.asarray(source).copy()
    pixels[background_mask] = config["background"]
    result = Image.fromarray(pixels).resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
    result.save(config["output"], optimize=True)
    print(f"Built {Path(config['output']).relative_to(ROOT)} ({OUTPUT_SIZE[0]}x{OUTPUT_SIZE[1]}, RGB)")

    frames = [wave_frame(result, angle, config["background"]) for angle in WAVE_ANGLES]
    frames[0].save(
        config["animated_output"],
        save_all=True,
        append_images=frames[1:],
        duration=WAVE_DURATION_MS,
        loop=0,
        lossless=True,
        method=6,
    )
    print(
        f"Built {Path(config['animated_output']).relative_to(ROOT)} "
        f"({len(frames)} frames, {len(frames) * WAVE_DURATION_MS / 1000:.1f}s loop)"
    )


def main() -> None:
    dark = Image.open(VARIANTS["dark"]["source"]).convert("RGB")
    light = Image.open(VARIANTS["light"]["source"]).convert("RGB")
    background_mask = connected_background(dark, light)
    for config in VARIANTS.values():
        build_variant(config, background_mask)


if __name__ == "__main__":
    main()
