"""Shared bits for the Syno case films built from real prototype captures."""
from __future__ import annotations

from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFilter

WIDTH, HEIGHT, FPS = 1920, 1200, 30
SCALE = WIDTH / 1280  # CSS px of the 1280 x 800 capture to film px


def load(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGB")
    if image.size != (2560, 1600):
        raise ValueError(f"Unexpected capture size: {path}: {image.size}")
    return image.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS).filter(
        ImageFilter.UnsharpMask(radius=1, percent=60, threshold=2)
    )


def ease(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def at(point: dict) -> tuple[float, float]:
    return point["x"] * SCALE, point["y"] * SCALE


def pointer(frame: Image.Image, x: float, y: float, pulse: float = 0.0) -> None:
    draw = ImageDraw.Draw(frame, "RGBA")
    s = 1.25
    shape = [(0, 0), (1, 24), (7, 18), (13, 30), (19, 27), (13, 16), (22, 15)]
    shape = [(round(x + a * s), round(y + b * s)) for a, b in shape]
    draw.polygon([(a + 2, b + 3) for a, b in shape], fill=(0, 0, 0, 70))
    draw.polygon(shape, fill=(255, 255, 255, 255), outline=(25, 25, 25, 255), width=2)
    if pulse:
        r = 12 + 18 * pulse
        draw.ellipse((x - r, y - r, x + r, y + r),
                     outline=(46, 119, 176, round(205 * (1 - pulse))), width=3)


class Film:
    def __init__(self, out: Path, crf: int = 18) -> None:
        self.out, self.frames = out, 0
        self.process = subprocess.Popen([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}",
            "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
            "-preset", "slow", "-tune", "stillimage", "-crf", str(crf), "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", str(out),
        ], stdin=subprocess.PIPE)

    def emit(self, image: Image.Image, ptr=None, pulse: float = 0.0) -> None:
        frame = image
        if ptr:
            frame = image.copy()
            pointer(frame, ptr[0], ptr[1], pulse)
        self.process.stdin.write(frame.tobytes())
        self.frames += 1

    def hold(self, image, seconds, ptr=None) -> None:
        for _ in range(round(seconds * FPS)):
            self.emit(image, ptr)

    def move(self, image, a, b, seconds, swap=None) -> None:
        """Pointer travels a to b. swap=(share, image) changes the state on arrival at the target."""
        n = round(seconds * FPS)
        for i in range(n):
            p = ease((i + 1) / n)
            shown = swap[1] if swap and p >= swap[0] else image
            self.emit(shown, (a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p))

    def click(self, image, ptr, seconds=0.18) -> None:
        n = round(seconds * FPS)
        for i in range(n):
            self.emit(image, ptr, ease((i + 1) / n))

    def fade(self, a, b, seconds, ptr=None) -> None:
        n = max(1, round(seconds * FPS))
        for i in range(n):
            self.emit(Image.blend(a, b, ease((i + 1) / n)), ptr)

    def close(self) -> None:
        self.process.stdin.close()
        if self.process.wait() != 0:
            raise RuntimeError("ffmpeg failed")
        print(f"{self.out} ({self.frames / FPS:.2f}s)")
