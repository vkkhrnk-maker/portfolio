#!/usr/bin/env python3
"""Short public-profile walkthrough from the current promo prototype capture."""

from pathlib import Path
import subprocess

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets-syno-case/films/source-profile-full.png"
DEST = ROOT / "assets-syno-case/films"
FILM = DEST / "syno-flow-profile.mp4"
POSTER = DEST / "syno-flow-profile-poster.jpg"
W, H, FPS = 1920, 1200, 30
SOURCE_W, SOURCE_H = 1280, 800
HEADER_H = 79


def ease(t: float) -> float:
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def scroll_y(t: float) -> int:
    if t < .55:
        return 0
    if t < 2.15:
        return round(900 * ease((t - .55) / 1.60))
    if t < 2.70:
        return 900
    if t < 4.35:
        return round(900 + 950 * ease((t - 2.70) / 1.65))
    return 1850


def main() -> None:
    source = Image.open(SOURCE).convert("RGB")
    if source.width != SOURCE_W or source.height < 3000:
        raise ValueError(f"Unexpected profile capture size: {source.size}")
    header = source.crop((0, 0, SOURCE_W, HEADER_H))
    frames = 153  # 5.1 seconds, including a hold on details / CV.
    command = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
        "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
        "-preset", "slow", "-tune", "stillimage", "-crf", "14",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(FILM),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    assert process.stdin is not None
    try:
        for i in range(frames):
            offset = scroll_y(i / FPS)
            frame = source.crop((0, offset, SOURCE_W, offset + SOURCE_H))
            if offset:
                frame.paste(header, (0, 0))
            frame = frame.resize((W, H), Image.Resampling.LANCZOS).filter(
                ImageFilter.UnsharpMask(radius=1, percent=80, threshold=2)
            )
            if i == 0:
                frame.save(POSTER, quality=94, subsampling=0)
            process.stdin.write(frame.tobytes())
    finally:
        process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError("ffmpeg failed")
    print(f"{FILM} ({frames / FPS:.1f}s)")


if __name__ == "__main__":
    main()
