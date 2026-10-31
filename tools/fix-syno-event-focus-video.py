#!/usr/bin/env python3
"""Remove a capture-time focus ring from the Add event author chooser film."""

from pathlib import Path
import subprocess

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
FILM = ROOT / "assets-syno-case/films/syno-flow-event.mp4"
OUT = FILM.with_suffix(".focusfix.mp4")
W, H, FPS = 1440, 900, 30
FRAME_BYTES = W * H * 3


def main() -> None:
    decoder = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", str(FILM), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE,
    )
    encoder = subprocess.Popen(
        ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
         "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p",
         "-movflags", "+faststart", str(OUT)],
        stdin=subprocess.PIPE,
    )
    assert decoder.stdout is not None and encoder.stdin is not None
    count = fixed = 0
    try:
        while data := decoder.stdout.read(FRAME_BYTES):
            if len(data) != FRAME_BYTES:
                raise RuntimeError(f"Truncated frame {count}")
            frame = np.frombuffer(data, np.uint8).reshape(H, W, 3).copy()
            # In the old recording the first option receives focus on open,
            # producing a black selection-like ring unrelated to the kit.
            if 54 <= count < 108:
                bg = frame[430, 700].copy()
                frame[437:445, 460:982] = bg
                frame[486:495, 460:982] = bg
                frame[437:495, 460:471] = bg
                frame[437:495, 970:982] = bg
                fixed += 1
            encoder.stdin.write(frame.tobytes())
            count += 1
    finally:
        decoder.stdout.close()
        encoder.stdin.close()
    if decoder.wait() != 0 or encoder.wait() != 0 or count != 192 or fixed < 20:
        OUT.unlink(missing_ok=True)
        raise RuntimeError(f"Unexpected render result: {count} frames, {fixed} repaired")
    OUT.replace(FILM)
    print(f"Updated {FILM}: {fixed}/{count} frames")


if __name__ == "__main__":
    main()
