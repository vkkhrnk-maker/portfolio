#!/usr/bin/env python3
"""Refresh the event-form controls in the existing walkthrough recording.

The source still is captured from proto-registry.html after the form controls
were normalized to 40 CSS px. The old recording is 112.5% of that viewport.
Only the stable form scene (after the hard cut at frame 108) is touched.
"""

from pathlib import Path
import subprocess
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
FILM = ROOT / "assets-syno-case/films/syno-flow-event.mp4"
STILL = ROOT / "assets-syno-case/stills/syno-event-form-40px.jpg"
OUT = FILM.with_suffix(".new.mp4")
W, H, FPS = 1440, 900, 30
FRAME_BYTES = W * H * 3

fresh = Image.open(STILL).convert("RGB").resize((W, 810), Image.Resampling.LANCZOS)
fresh = np.asarray(fresh)

decoder = subprocess.Popen(
    ["ffmpeg", "-v", "error", "-i", str(FILM), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
    stdout=subprocess.PIPE,
)
encoder = subprocess.Popen(
    ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
     "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
     "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUT)],
    stdin=subprocess.PIPE,
)

count = 0
while True:
    data = decoder.stdout.read(FRAME_BYTES)
    if not data:
        break
    if len(data) != FRAME_BYTES:
        raise RuntimeError(f"Truncated frame {count}")
    frame = np.frombuffer(data, np.uint8).reshape(H, W, 3).copy()
    if count >= 108:
        # Both controls in the paired row now share one exact 40 px kit height.
        frame[554:615, 380:1402] = fresh[554:615, 380:1402]
        # The schedule select is the same 40 px; the old lower edge is removed.
        frame[687:741, 380:1402] = fresh[687:741, 380:1402]
        frame[741:750, 380:1402] = frame[751, 1000]
    encoder.stdin.write(frame.tobytes())
    count += 1

decoder.stdout.close()
encoder.stdin.close()
if decoder.wait() != 0 or encoder.wait() != 0 or count != 192:
    raise RuntimeError(f"Unexpected render result: {count} frames")
OUT.replace(FILM)
print(f"Updated {FILM}: {count} frames")
