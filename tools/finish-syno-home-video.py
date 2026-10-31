#!/usr/bin/env python3
"""Close the desktop home-page scroll film on its opening carousel frame."""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FILMS = ROOT / "assets-syno-case" / "films"
SOURCE = FILMS / "syno-scroll-home-1280-source.mp4"
TARGET = FILMS / "syno-scroll-home-1280.mp4"


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def main() -> None:
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(SOURCE)],
        capture_output=True,
        text=True,
        check=True,
    )
    duration = float(json.loads(probe.stdout)["format"]["duration"])
    if abs(duration - 17.6) > 0.05:
        raise ValueError(f"Unexpected home-film source duration: {duration}s")

    with tempfile.TemporaryDirectory(prefix="syno-home-") as directory:
        first = Path(directory) / "first.png"
        temp = FILMS / "syno-scroll-home-1280.rendering.mp4"
        run("ffmpeg", "-y", "-v", "error", "-i", str(SOURCE), "-frames:v", "1", str(first))
        try:
            run(
                "ffmpeg", "-y", "-v", "error", "-i", str(SOURCE),
                "-loop", "1", "-framerate", "30", "-t", "1.5", "-i", str(first),
                "-filter_complex",
                "[0:v]fps=30,settb=AVTB,setpts=PTS-STARTPTS,format=yuv420p,setsar=1[a];"
                "[1:v]fps=30,settb=AVTB,setpts=PTS-STARTPTS,format=yuv420p,setsar=1[b];"
                "[a][b]xfade=transition=fade:duration=0.25:offset=17.3,format=yuv420p[v]",
                "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(temp),
            )
            os.replace(temp, TARGET)
        finally:
            temp.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
