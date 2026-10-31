#!/usr/bin/env python3
"""Mobile public-profile scroll from the current promo prototype capture."""

from pathlib import Path
import subprocess

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets-syno-case/films/source-profile-full-mobile.png"
DEST = ROOT / "assets-syno-case/films"
FILM = DEST / "syno-flow-profile-mobile.mp4"
POSTER = DEST / "syno-flow-profile-mobile-poster.jpg"
LEFT, RIGHT, SOURCE_H = 439, 841, 812
W, H, FPS = 804, 1624, 30
HEADER_H = 78


def ease(t: float) -> float:
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def scroll_y(t: float) -> int:
    if t < .5:
        return 0
    if t < 2.4:
        return round(1050 * ease((t - .5) / 1.9))
    if t < 3.0:
        return 1050
    if t < 4.7:
        return round(1050 + 900 * ease((t - 3.0) / 1.7))
    return 1950


def main() -> None:
    source = Image.open(SOURCE).convert("RGB")
    if source.width != 1280 or source.height < 4000:
        raise ValueError(f"Unexpected mobile capture size: {source.size}")
    header = source.crop((LEFT, 0, RIGHT, HEADER_H))
    frames = 159
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
            frame = source.crop((LEFT, offset, RIGHT, offset + SOURCE_H))
            if offset:
                frame.paste(header, (0, 0))
            frame = frame.resize((W, H), Image.Resampling.LANCZOS).filter(
                ImageFilter.UnsharpMask(radius=1, percent=75, threshold=2)
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
