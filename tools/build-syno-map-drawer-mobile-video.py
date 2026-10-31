#!/usr/bin/env python3
"""Mobile companion to the Art Map -> event drawer walkthrough."""

from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets-syno-case/films/source-map-drawer-mobile"
DEST = ROOT / "assets-syno-case/films"
FILM = DEST / "syno-flow-map-drawer-mobile.mp4"
POSTER = DEST / "syno-flow-map-drawer-mobile-poster.jpg"
WIDTH, HEIGHT, FPS = 750, 1624, 30


def load(name: str) -> Image.Image:
    image = Image.open(SOURCE / name).convert("RGB")
    if image.size != (375, 812):
        raise ValueError(f"Unexpected frame size: {name}: {image.size}")
    return image.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS).filter(
        ImageFilter.UnsharpMask(radius=1, percent=85, threshold=2)
    )


def tap(frame: Image.Image, x: int, y: int, phase: float) -> Image.Image:
    frame = frame.copy()
    draw = ImageDraw.Draw(frame, "RGBA")
    r = round(14 + 16 * phase)
    alpha = round(210 * (1 - phase))
    draw.ellipse((x - r, y - r, x + r, y + r),
                 outline=(44, 120, 178, alpha), width=4)
    draw.ellipse((x - 5, y - 5, x + 5, y + 5), fill=(44, 120, 178, 160))
    return frame


def main() -> None:
    map_frame, results, opened = (load(n) for n in ("map.png", "results.png", "open.png"))
    scroll = [load(f"scroll-{i:02d}.png") for i in range(1, 19)]
    opened.save(POSTER, quality=94, subsampling=0)
    frames: list[Image.Image] = []
    for i in range(20):
        frames.append(tap(map_frame, 281, 1171, (i - 14) / 6) if i >= 14 else map_frame)
    for i in range(1, 6):
        frames.append(Image.blend(map_frame, results, i / 5))
    for i in range(22):
        frames.append(tap(results, 270, 414, (i - 16) / 6) if i >= 16 else results)
    for i in range(1, 6):
        frames.append(Image.blend(results, opened, i / 5))
    frames.extend([opened] * 25)
    for frame in scroll:
        frames.extend([frame] * 2)
    frames.extend([scroll[-1]] * 30)

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
