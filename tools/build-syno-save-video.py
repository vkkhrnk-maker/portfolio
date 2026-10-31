#!/usr/bin/env python3
"""Build the compact Save walkthrough from captured prototype states.

The frames are actual browser captures of the local Syno prototype.  The
browser journey is: homepage Save -> guest gate -> saved state -> Favourites.
"""

from __future__ import annotations

from pathlib import Path
import math
import subprocess

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets-syno-case/films/source-save"
DEST = ROOT / "assets-syno-case/films"
OUT = DEST / "syno-flow-save.mp4"
POSTER = DEST / "syno-flow-save-poster.jpg"
FPS = 30
WIDTH, HEIGHT = 1440, 900
CROP_HEIGHT = 639

STATES = [
    ("home-card.png", 60),
    ("guest-gate.png", 60),
    ("home-saved.png", 60),
    ("favourites.png", 115),
]
# Short holds make the same homepage layout read as a single interaction.
BOUNDARIES = (0.0, 0.86, 2.04, 2.76, 4.48)


def screenshot(name: str, top: int) -> Image.Image:
    image = Image.open(SOURCE / name).convert("RGB")
    if image.size != (1022, 754):
        raise ValueError(f"Unexpected screenshot size: {name} {image.size}")
    image = image.crop((0, top, 1022, top + CROP_HEIGHT))
    return image.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)


def ease(value: float) -> float:
    value = min(1.0, max(0.0, value))
    return 1 - (1 - value) ** 3


def pointer(image: Image.Image, x: float, y: float, pulse: float = 0) -> None:
    """A small pointer makes the two actual clicks readable without labels."""
    draw = ImageDraw.Draw(image, "RGBA")
    x, y = round(x), round(y)
    shape = [(x, y), (x + 1, y + 25), (x + 7, y + 19), (x + 13, y + 31),
             (x + 19, y + 28), (x + 13, y + 17), (x + 22, y + 16)]
    draw.polygon([(a + 2, b + 3) for a, b in shape], fill=(0, 0, 0, 70))
    draw.polygon(shape, fill=(255, 255, 255, 255), outline=(20, 20, 20, 255), width=2)
    if pulse:
        r = 10 + 15 * pulse
        draw.ellipse((x - r, y - r, x + r, y + r),
                     outline=(37, 115, 166, round(210 * (1 - pulse))), width=3)


def main() -> None:
    images = [screenshot(*item) for item in STATES]
    images[1].save(POSTER, quality=94, subsampling=0)
    command = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}",
        "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
        "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(OUT),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    assert process.stdin is not None
    try:
        for frame in range(math.ceil(BOUNDARIES[-1] * FPS)):
            t = frame / FPS
            stage = max(i for i in range(4) if t >= BOUNDARIES[i])
            image = images[stage].copy()
            elapsed = t - BOUNDARIES[stage]

            # The source capture uses the dialog's neutral focus state.
            # Cursor movement supplies the missing temporal cue.
            if stage == 0:
                p = ease(elapsed / 0.57)
                x = 750 + (600 - 750) * p
                y = 635 + (450 - 635) * p
                pulse = ease((elapsed - 0.67) / 0.18) if elapsed >= 0.67 else 0
                pointer(image, x, y, pulse)
            elif stage == 1:
                p = ease(elapsed / 0.86)
                x = 990 + (1197 - 990) * p
                y = 762 + (641 - 762) * p
                pulse = ease((elapsed - 0.96) / 0.18) if elapsed >= 0.96 else 0
                pointer(image, x, y, pulse)

            # A tiny dissolve on the scene cut hides the browser's one-pixel
            # scroll settling. The gate and Saved states themselves stay sharp.
            if stage and elapsed < 0.12:
                alpha = ease(elapsed / 0.12)
                image = Image.blend(images[stage - 1], image, alpha)

            process.stdin.write(image.tobytes())
    finally:
        process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError("ffmpeg failed")
    print(f"{OUT} ({BOUNDARIES[-1]:.2f}s)")


if __name__ == "__main__":
    main()
