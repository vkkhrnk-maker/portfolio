#!/usr/bin/env python3
"""Build one short Art Map -> event drawer walkthrough from prototype captures.

All UI frames are captured from the real local prototype at 1280 x 800. The
scroll sequence moves only the drawer; the list, filters and map stay in place.
"""

from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets-syno-case/films/source-map-drawer"
DEST = ROOT / "assets-syno-case/films"
FILM = DEST / "syno-flow-map-drawer.mp4"
POSTER = DEST / "syno-flow-map-drawer-poster.jpg"
WIDTH, HEIGHT, FPS = 1920, 1200, 30


def load(name: str) -> Image.Image:
    image = Image.open(SOURCE / name).convert("RGB")
    if image.size != (1280, 800):
        raise ValueError(f"Unexpected frame size: {name}: {image.size}")
    # The promo prototype used to omit the top frame rule and its right endcap.
    # Restore the same one-pixel rule that now appears in the live prototype.
    draw = ImageDraw.Draw(image)
    draw.line((19, 20, 1260, 20), fill=(174, 173, 170), width=1)
    # The same goes for the bottom rule: older captures end without it.
    draw.line((19, 780, 1260, 780), fill=(174, 173, 170), width=1)
    return image.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS).filter(
        ImageFilter.UnsharpMask(radius=1, percent=85, threshold=2)
    )


def ease(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def pointer(frame: Image.Image, x: float, y: float, pulse: float = 0.0) -> None:
    draw = ImageDraw.Draw(frame, "RGBA")
    x, y = round(x), round(y)
    shape = [(x, y), (x + 1, y + 24), (x + 7, y + 18),
             (x + 13, y + 30), (x + 19, y + 27), (x + 13, y + 16),
             (x + 22, y + 15)]
    draw.polygon([(a + 2, b + 3) for a, b in shape], fill=(0, 0, 0, 70))
    draw.polygon(shape, fill=(255, 255, 255, 255), outline=(25, 25, 25, 255), width=2)
    if pulse:
        r = 10 + 15 * pulse
        draw.ellipse((x - r, y - r, x + r, y + r),
                     outline=(46, 119, 176, round(205 * (1 - pulse))), width=3)


def main() -> None:
    initial, opened = load("map.png"), load("open.png")
    scroll = [load(f"scroll-{i:02d}.png") for i in range(1, 21)]
    opened.save(POSTER, quality=94, subsampling=0)
    frames: list[Image.Image] = []

    # Select the event on the list; the visible pointer clarifies the action.
    for i in range(24):
        frame = initial.copy()
        p = ease(i / 18)
        x = 720 + (216 - 720) * p
        y = 530 + (384 - 530) * p
        pointer(frame, x, y, ease((i - 19) / 5) if i >= 19 else 0)
        frames.append(frame)
    # Brief transition in the same 1280 x 800 viewport.
    for i in range(1, 7):
        frames.append(Image.blend(initial, opened, ease(i / 6)))
    frames.extend([opened] * 24)

    # Actual browser scroll positions, 48 CSS pixels between captures.
    for frame in scroll[:9]:
        frames.extend([frame] * 2)
    frames.extend([scroll[8]] * 15)  # Dates, venue and About remain readable.
    for frame in scroll[9:]:
        frames.extend([frame] * 2)
    frames.extend([scroll[-1]] * 33)  # End on Mira Soleni and her work.

    command = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}",
        "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
        "-preset", "slow", "-tune", "stillimage", "-crf", "14", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(FILM),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    assert process.stdin is not None
    try:
        for frame in frames:
            process.stdin.write(frame.tobytes())
    finally:
        process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError("ffmpeg failed")
    print(f"{FILM} ({len(frames) / FPS:.2f}s)")


if __name__ == "__main__":
    main()
