#!/usr/bin/env python3
"""Build a small 2.5D greeting loop from one fixed portrait.

The face, body, clothes, and camera remain a single raster throughout the
animation. The raised hand is rotated around the wrist; a tiny local warp adds
head, hair, and smile motion without generating replacement identity frames.
"""

from __future__ import annotations

import math
import shutil
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter
from scipy.ndimage import binary_erosion, distance_transform_edt


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/hero-wave-frames/blue-wave-out.png"
OUT_DIR = ROOT / "assets"
LAYER_DIR = OUT_DIR / "hero-wave-frames"

BASE_WIDTH = 480
BASE_HEIGHT = 1012
WIDTH = 864
HEIGHT = 1820
FPS = 24
DURATION = 4.0

SCALE_X = WIDTH / BASE_WIDTH
SCALE_Y = HEIGHT / BASE_HEIGHT


def sx(value: float) -> float:
    return value * SCALE_X


def sy(value: float) -> float:
    return value * SCALE_Y


def scaled_filter_size(base_size: int) -> int:
    """Scale an odd Pillow morphology kernel to the native-size render."""
    size = max(3, round(base_size * min(SCALE_X, SCALE_Y)))
    return size if size % 2 else size + 1


def ease_in_out(value: float) -> float:
    return 0.5 - 0.5 * math.cos(math.pi * value)


def keyed_value(seconds: float, keys: list[tuple[float, float]]) -> float:
    for (t0, value0), (t1, value1) in zip(keys, keys[1:]):
        if seconds <= t1:
            progress = ease_in_out((seconds - t0) / (t1 - t0))
            return value0 + (value1 - value0) * progress
    return keys[-1][1]


def angle_at(seconds: float) -> float:
    # A short greeting followed by a generous still pause. The first and last
    # poses are identical, so autoplay looping has no visible seam.
    keys = [
        (0.00, 0.0),
        (0.32, 0.0),
        (0.70, -7.0),
        (1.00, 7.0),
        (1.29, -5.5),
        (1.57, 4.0),
        (1.88, 0.0),
        (DURATION, 0.0),
    ]
    return keyed_value(seconds, keys)


def head_angle_at(seconds: float) -> float:
    return keyed_value(
        seconds,
        [
            (0.00, 0.0),
            (0.30, 0.0),
            (0.86, -0.72),
            (1.35, -0.35),
            (2.08, 0.0),
            (DURATION, 0.0),
        ],
    )


def head_shift_at(seconds: float) -> tuple[float, float]:
    amount = keyed_value(
        seconds,
        [(0.0, 0.0), (0.34, 0.0), (0.92, 1.0), (1.55, 0.55), (2.12, 0.0), (DURATION, 0.0)],
    )
    return (-0.85 * amount, 0.45 * amount)


def hair_sway_at(seconds: float) -> float:
    return keyed_value(
        seconds,
        [
            (0.00, 0.0),
            (0.48, 0.0),
            (0.82, 0.75),
            (1.16, -0.55),
            (1.52, 0.38),
            (1.92, 0.0),
            (DURATION, 0.0),
        ],
    )


def smile_at(seconds: float) -> float:
    return keyed_value(
        seconds,
        [(0.00, 0.0), (0.38, 0.0), (0.88, 1.0), (1.52, 1.0), (2.18, 0.0), (DURATION, 0.0)],
    )


def fit_background(image: np.ndarray, foreground: np.ndarray) -> np.ndarray:
    """Fit the nearly neutral studio backdrop around the raised hand."""
    height, width, _ = image.shape
    yy, xx = np.mgrid[0:height, 0:width]

    region = (
        (xx >= int(width * 0.035))
        & (xx <= int(width * 0.34))
        & (yy >= int(height * 0.115))
        & (yy <= int(height * 0.315))
    )
    spread = image.max(axis=2) - image.min(axis=2)
    neutral = region & (spread < 13) & (image.mean(axis=2) > 185) & ~foreground

    x = xx[neutral] / width
    y = yy[neutral] / height
    design = np.column_stack((np.ones_like(x), x, y, x * x, y * y, x * y))

    all_x = xx / width
    all_y = yy / height
    all_design = np.stack(
        (
            np.ones_like(all_x),
            all_x,
            all_y,
            all_x * all_x,
            all_y * all_y,
            all_x * all_y,
        ),
        axis=-1,
    )

    backdrop = np.empty_like(image, dtype=np.float32)
    for channel in range(3):
        coefficients, *_ = np.linalg.lstsq(design, image[:, :, channel][neutral], rcond=None)
        backdrop[:, :, channel] = all_design @ coefficients
    return np.clip(backdrop, 0, 255).astype(np.uint8)


def prepare_layers(source: Image.Image) -> tuple[Image.Image, Image.Image, tuple[int, int]]:
    image = source.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS).convert("RGB")
    pixels = np.asarray(image).astype(np.float32)
    red, green, blue = pixels[:, :, 0], pixels[:, :, 1], pixels[:, :, 2]

    yy, xx = np.mgrid[0:HEIGHT, 0:WIDTH]
    hand_region = (
        (xx >= int(WIDTH * 0.115))
        & (xx <= int(WIDTH * 0.295))
        & (yy >= int(HEIGHT * 0.155))
        & (yy <= int(HEIGHT * 0.285))
    )
    skin = (
        hand_region
        & (red > 105)
        & ((red - green) > 7)
        & ((green - blue) > 2)
        & ((red - blue) > 20)
    )

    # Keep all anti-aliased fingertips, then soften only the outermost pixel.
    mask = Image.fromarray((skin * 255).astype(np.uint8), "L")
    mask = mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.55))
    alpha = np.asarray(mask).astype(np.float32) / 255.0

    pivot = (round(WIDTH * 0.231), round(HEIGHT * 0.258))

    # Leave the final few pixels of the wrist attached to the cuff. This hides
    # the rotational seam without allowing the original hand to ghost through.
    wrist_fade = np.clip((pivot[1] + 5 - yy) / 10.0, 0.0, 1.0)
    erase_alpha = np.clip(alpha * wrist_fade, 0.0, 1.0)

    backdrop = fit_background(pixels, skin)

    # Rotating the hand about the wrist uncovers a sliver of whatever was put
    # in its place. Down by the wrist and cuff that sliver borders the body,
    # and backdrop there read as a bite taken out of the arm. So near the
    # body the hole is filled with the nearest figure colour instead — wrist
    # skin, cuff blue — and only farther out, where the sliver borders empty
    # backdrop anyway, does the fitted backdrop take over. The fill is kept
    # to the palm: up by the fingers the nearest figure is hair, and a smear
    # of hair colour beside a moving finger is worse than backdrop.
    erased = erase_alpha > 0.02
    spread = pixels.max(axis=2) - pixels.min(axis=2)
    figure = ~erased & ~((spread < 15) & (pixels.mean(axis=2) > 155))
    distance, nearest = distance_transform_edt(~figure, return_indices=True)
    interior = pixels[nearest[0], nearest[1]]
    # Nearest-colour fill is piecewise flat with hard seams where the nearest
    # figure pixel switches from cuff to wrist; a blur turns those into
    # gradients. Only the sliver the turning hand uncovers is ever seen.
    interior = np.asarray(
        Image.fromarray(np.clip(interior, 0, 255).astype(np.uint8), "RGB").filter(
            ImageFilter.GaussianBlur(sx(5.0))
        )
    ).astype(np.float32)
    # Kept tight to the wrist: the turn uncovers only a few pixels there, and
    # anything farther up the palm borders open backdrop, where the right
    # answer is the page showing through, not a guess at a sleeve.
    band = sx(12.0)
    near = np.clip((band - distance) / (band * 0.4), 0.0, 1.0)
    near *= smoothstep((yy - (pivot[1] - sy(35.0))) / sy(16.0))
    fill = backdrop * (1.0 - near[:, :, None]) + interior * near[:, :, None]
    clean = pixels * (1.0 - erase_alpha[:, :, None]) + fill * erase_alpha[:, :, None]
    clean_plate = Image.fromarray(np.clip(clean, 0, 255).astype(np.uint8), "RGB")

    # The dilated alpha keeps every fingertip, but it also keeps a pixel of
    # studio backdrop along the whole outline. At rest that rim lands back on
    # backdrop; once the hand turns it lands on the cuff as a pale crescent,
    # and on a dark page it is a halo. Repaint the rim with the nearest skin
    # so the alpha alone draws the edge.
    hand_layer = defringe(image, mask).convert("RGBA")
    hand_layer.putalpha(mask)
    return clean_plate, hand_layer, pivot


def smoothstep(values: np.ndarray) -> np.ndarray:
    values = np.clip(values, 0.0, 1.0)
    return values * values * (3.0 - 2.0 * values)


def prepare_motion_masks(image: Image.Image) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    pixels = np.asarray(image.convert("RGB")).astype(np.float32)
    yy, xx = np.mgrid[0:HEIGHT, 0:WIDTH].astype(np.float32)

    # Soft oval around the head, tapering to zero at the neck. The surrounding
    # backdrop participates at the feathered edge, so the silhouette does not
    # reveal holes when it moves by one or two pixels.
    radial = np.sqrt(((xx - sx(246.0)) / sx(139.0)) ** 2 + ((yy - sy(132.0)) / sy(151.0)) ** 2)
    head_mask = smoothstep((1.14 - radial) / 0.34)
    neck_anchor = smoothstep((sy(278.0) - yy) / sy(78.0))
    head_mask *= neck_anchor

    red, green, blue = pixels[:, :, 0], pixels[:, :, 1], pixels[:, :, 2]
    hair_region = (xx > sx(132)) & (xx < sx(360)) & (yy > sy(24)) & (yy < sy(258))
    outer_hair = (xx < sx(219)) | (xx > sx(279)) | (yy < sy(91)) | (yy > sy(181))
    dark_warm = (red < 165) & (green < 142) & (blue < 132) & (red > green - 12)
    raw_hair = Image.fromarray(((hair_region & outer_hair & dark_warm) * 255).astype(np.uint8), "L")
    hair_mask = np.asarray(
        raw_hair.filter(ImageFilter.MaxFilter(scaled_filter_size(9))).filter(
            ImageFilter.GaussianBlur(sx(5.0))
        )
    ).astype(np.float32) / 255.0

    return xx, yy, head_mask, hair_mask * head_mask


def bilinear_sample(pixels: np.ndarray, source_x: np.ndarray, source_y: np.ndarray) -> np.ndarray:
    source_x = np.clip(source_x, 0.0, WIDTH - 1.001)
    source_y = np.clip(source_y, 0.0, HEIGHT - 1.001)
    x0 = np.floor(source_x).astype(np.int32)
    y0 = np.floor(source_y).astype(np.int32)
    x1 = np.minimum(x0 + 1, WIDTH - 1)
    y1 = np.minimum(y0 + 1, HEIGHT - 1)

    wx = (source_x - x0)[:, :, None]
    wy = (source_y - y0)[:, :, None]
    top = pixels[y0, x0] * (1.0 - wx) + pixels[y0, x1] * wx
    bottom = pixels[y1, x0] * (1.0 - wx) + pixels[y1, x1] * wx
    return top * (1.0 - wy) + bottom * wy


def animate_head(
    clean_plate: Image.Image,
    seconds: float,
    motion_data: tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray],
) -> Image.Image:
    xx, yy, head_mask, hair_mask = motion_data
    angle = math.radians(head_angle_at(seconds))
    shift_x, shift_y = head_shift_at(seconds)

    pivot_x, pivot_y = sx(246.0), sy(218.0)
    translated_x = xx - pivot_x - sx(shift_x)
    translated_y = yy - pivot_y - sy(shift_y)
    cos_angle = math.cos(angle)
    sin_angle = math.sin(angle)

    # Inverse map: every output pixel asks where it came from in the one fixed
    # portrait. This avoids cutout holes and keeps the identity frame exact.
    rotated_x = cos_angle * translated_x + sin_angle * translated_y + pivot_x
    rotated_y = -sin_angle * translated_x + cos_angle * translated_y + pivot_y
    source_x = xx + head_mask * (rotated_x - xx)
    source_y = yy + head_mask * (rotated_y - yy)

    sway = hair_sway_at(seconds)
    source_x -= hair_mask * sx(sway)
    source_y += hair_mask * sy(abs(sway) * 0.22)

    smile = smile_at(seconds)
    mouth_x = xx - sx(247.0)
    mouth_y = yy - sy(156.0)
    mouth_mask = np.exp(-0.5 * ((mouth_x / sx(29.0)) ** 2 + (mouth_y / sy(12.0)) ** 2))
    corner_weight = np.clip(np.abs(mouth_x) / sx(27.0), 0.0, 1.0)
    source_y += sy(smile * 1.35) * corner_weight * mouth_mask
    source_x -= smile * 0.038 * mouth_x * mouth_mask

    pixels = np.asarray(clean_plate.convert("RGB")).astype(np.float32)
    warped = bilinear_sample(pixels, source_x, source_y)
    return Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), "RGB")


def foreground_mask(frame: Image.Image) -> Image.Image:
    """Extract the figure while keeping pale clothes enclosed by its outline."""
    pixels = np.asarray(frame.convert("RGB")).astype(np.int16)
    spread = pixels.max(axis=2) - pixels.min(axis=2)
    brightness = pixels.mean(axis=2)

    # The studio backdrop is bright and neutral. Pale clothes also satisfy
    # that test, but unlike the backdrop they are enclosed by the silhouette,
    # so a border-connected flood fill leaves them intact.
    background_candidate = (spread < 15) & (brightness > 155)
    # copy() gives Pillow a writable buffer; Image.fromarray may otherwise
    # retain NumPy's read-only storage and make floodfill a silent no-op.
    flood_map = Image.fromarray(
        np.where(background_candidate, 0, 255).astype(np.uint8), "L"
    ).copy()
    ImageDraw.floodfill(flood_map, (0, 0), 128, thresh=0)
    connected_background = np.asarray(flood_map) == 128
    raw_mask = Image.fromarray((~connected_background * 255).astype(np.uint8), "L")

    # Seal tiny anti-aliased gaps around pale shoes and the ivory top, then
    # fill enclosed holes. Open negative spaces (between fingers and legs)
    # stay connected to the outside and therefore remain transparent.
    closed = raw_mask.filter(ImageFilter.MaxFilter(scaled_filter_size(5))).filter(
        ImageFilter.MinFilter(scaled_filter_size(5))
    )
    shoe_closed = raw_mask.filter(ImageFilter.MaxFilter(scaled_filter_size(13))).filter(
        ImageFilter.MinFilter(scaled_filter_size(13))
    )
    closed_pixels = np.asarray(closed).copy()
    shoe_pixels = np.asarray(shoe_closed)
    closed_pixels[round(sy(844)):, :] = np.maximum(
        closed_pixels[round(sy(844)):, :], shoe_pixels[round(sy(844)):, :]
    )
    closed = Image.fromarray(closed_pixels, "L")
    outside_map = closed.copy()
    ImageDraw.floodfill(outside_map, (0, 0), 128, thresh=0)
    outside = np.asarray(outside_map) == 128
    filled = Image.fromarray((~outside * 255).astype(np.uint8), "L")

    # Contract farther than the old 480px render before feathering. The source
    # was originally matted over a light studio plate, so a one-pixel erosion
    # still left bright colour contamination on dark backgrounds.
    return filled.filter(ImageFilter.MinFilter(scaled_filter_size(5))).filter(
        ImageFilter.GaussianBlur(sx(0.55))
    )


# Sealed gaps. The closing that keeps pale shoes and the ivory top whole also
# seals the hairline between two touching fingers and the slit below the
# crotch, and the hole fill then makes them opaque — studio backdrop painted
# as part of the figure, which on the dark page is a white line. The old mask
# happened to reopen the finger gaps with its erosion; the hand's own alpha
# does not. So inside two zones that hold no pale clothing — around the hand,
# wherever it swings, and between the legs above the shoes — anything the
# colour of the backdrop is made transparent again. Geometry is fixed: the
# camera and body never move, only the hand turns inside its zone.
CLEAR_ZONES = (
    (0.09, 0.13, 0.34, 0.31),   # hand, with room for the swing
    (0.40, 0.52, 0.60, 0.82),   # between the legs, stopping above the shoes
)


def strip_sealed_backdrop(mask: Image.Image, frame: Image.Image) -> Image.Image:
    pixels = np.asarray(frame.convert("RGB")).astype(np.float32)
    spread = pixels.max(axis=2) - pixels.min(axis=2)
    brightness = pixels.mean(axis=2)
    # Thresholds sit clear of the anti-aliased skin rim (which has more chroma
    # and less brightness than bare backdrop), and the map is softened half a
    # pixel so the cut never lands as a stair-step.
    backdrop = smoothstep((brightness - 135.0) / 15.0) * smoothstep((16.0 - spread) / 8.0)
    backdrop = np.asarray(
        Image.fromarray((backdrop * 255).astype(np.uint8), "L").filter(
            ImageFilter.GaussianBlur(sx(0.5))
        )
    ).astype(np.float32) / 255.0
    gate = np.zeros_like(backdrop)
    for x0, y0, x1, y1 in CLEAR_ZONES:
        gate[int(HEIGHT * y0):int(HEIGHT * y1), int(WIDTH * x0):int(WIDTH * x1)] = 1.0
    alpha = np.asarray(mask).astype(np.float32) / 255.0
    alpha *= 1.0 - backdrop * gate
    return Image.fromarray(np.clip(alpha * 255.0, 0, 255).astype(np.uint8), "L")


def defringe(frame: Image.Image, mask: Image.Image) -> Image.Image:
    """Replace the narrow light-matted rim with nearest interior colours."""
    pixels = np.asarray(frame.convert("RGB")).astype(np.float32)
    alpha = np.asarray(mask).astype(np.float32) / 255.0
    subject = alpha > 0.02

    # A four-pixel native-resolution core is enough to get beyond the studio
    # glow without pulling colours across fingers, hair gaps, or trouser legs.
    iterations = max(2, round(2.2 * min(SCALE_X, SCALE_Y)))
    core = binary_erosion(alpha > 0.92, iterations=iterations)
    _, nearest = distance_transform_edt(~core, return_indices=True)
    interior_color = pixels[nearest[0], nearest[1]]

    distance_inside = distance_transform_edt(subject)
    band_width = max(3.0, sx(3.2))
    strength = np.clip((band_width - distance_inside) / band_width, 0.0, 1.0)
    strength *= subject
    cleaned = pixels * (1.0 - strength[:, :, None]) + interior_color * strength[:, :, None]
    return Image.fromarray(np.clip(cleaned, 0, 255).astype(np.uint8), "RGB")


def place_on_background(
    frame: Image.Image,
    color: tuple[int, int, int],
    mask: Image.Image,
    clean_edge: bool = False,
) -> Image.Image:
    canvas = Image.new("RGB", frame.size, color)
    foreground = defringe(frame, mask) if clean_edge else frame
    canvas.paste(foreground, (0, 0), mask)
    return canvas.filter(ImageFilter.UnsharpMask(radius=0.75, percent=55, threshold=3))


def run_ffmpeg(arguments: list[str]) -> None:
    executable = shutil.which("ffmpeg")
    if executable is None:
        raise RuntimeError("ffmpeg is required to encode the animation")
    subprocess.run([executable, "-y", *arguments], check=True)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    LAYER_DIR.mkdir(parents=True, exist_ok=True)

    source = Image.open(SOURCE)
    clean_plate, hand_layer, pivot = prepare_layers(source)
    clean_plate.save(LAYER_DIR / "blue-wave-clean-plate.png")
    hand_layer.save(LAYER_DIR / "blue-wave-hand-layer.png")

    light_mp4 = OUT_DIR / "viktoria-wave-blue-alive-light-v5.mp4"
    light_webm = OUT_DIR / "viktoria-wave-blue-alive-light-v5.webm"
    light_poster = OUT_DIR / "viktoria-wave-blue-alive-light-poster-v5.jpg"
    dark_mp4 = OUT_DIR / "viktoria-wave-blue-alive-dark-v5.mp4"
    dark_webm = OUT_DIR / "viktoria-wave-blue-alive-dark-v5.webm"
    dark_poster = OUT_DIR / "viktoria-wave-blue-alive-dark-poster-v5.jpg"
    # Alpha cuts. The opaque files above bake the figure onto a flat plate the
    # colour of the page — and the browser's video pipeline composites that
    # plate two levels off, which shows as a pale rectangle. With a real alpha
    # channel there is no plate to mismatch: the page itself shows through.
    light_alpha = OUT_DIR / "viktoria-wave-blue-alive-light-alpha-v5.webm"
    dark_alpha = OUT_DIR / "viktoria-wave-blue-alive-dark-alpha-v5.webm"
    motion_data = prepare_motion_masks(clean_plate)

    with tempfile.TemporaryDirectory(prefix="viktoria-wave-") as temp_name:
        temp_dir = Path(temp_name)
        light_dir = temp_dir / "light"
        dark_dir = temp_dir / "dark"
        light_alpha_dir = temp_dir / "light-alpha"
        dark_alpha_dir = temp_dir / "dark-alpha"
        for d in (light_dir, dark_dir, light_alpha_dir, dark_alpha_dir):
            d.mkdir()
        total_frames = round(FPS * DURATION)
        for frame_number in range(total_frames):
            seconds = frame_number / FPS
            moving_hand = hand_layer.rotate(
                angle_at(seconds),
                resample=Image.Resampling.BICUBIC,
                center=pivot,
                expand=False,
            )
            frame = animate_head(clean_plate, seconds, motion_data).convert("RGBA")
            frame.alpha_composite(moving_hand)
            frame = frame.convert("RGB")
            # The flood-fill mask is right for the body but crude on the hand:
            # it loses fingertips to the erosion and steps along the fingers.
            # The hand layer carries its own clean alpha, rotated with it, so
            # the mask takes the lighter of the two — the body from the fill,
            # the hand from its layer.
            mask = strip_sealed_backdrop(
                ImageChops.lighter(foreground_mask(frame), moving_hand.split()[-1]), frame
            )
            light = place_on_background(frame, (240, 240, 240), mask)
            dark = place_on_background(frame, (19, 19, 22), mask, clean_edge=True)
            light.save(light_dir / f"frame-{frame_number:04d}.png")
            dark.save(dark_dir / f"frame-{frame_number:04d}.png")
            # Same RGB, plus the figure's own mask as alpha. Keeping the RGB
            # pre-composited against the theme colour means the edge pixels
            # stay exactly what they are today — they land back on the very
            # colour they were blended with — while the flat plate drops out.
            # The blur that softens the outline also lifts alpha back into any
            # slit narrower than itself, so the backdrop pixels are cleared once
            # more after it.
            alpha = strip_sealed_backdrop(mask.filter(ImageFilter.GaussianBlur(sx(0.6))), frame)
            for composite, alpha_dir in ((light, light_alpha_dir), (dark, dark_alpha_dir)):
                cut = composite.convert("RGBA")
                cut.putalpha(alpha)
                cut.save(alpha_dir / f"frame-{frame_number:04d}.png")

        Image.open(light_dir / "frame-0000.png").convert("RGB").save(
            light_poster, quality=95, optimize=True
        )
        Image.open(dark_dir / "frame-0000.png").convert("RGB").save(
            dark_poster, quality=95, optimize=True
        )

        # VP9 keeps an alpha channel in WebM; H.264 cannot, so the opaque mp4
        # stays as the fallback for players without it (Safari today).
        for frame_dir, out in ((light_alpha_dir, light_alpha),
                               (dark_alpha_dir, dark_alpha)):
            run_ffmpeg(
                [
                    "-framerate",
                    str(FPS),
                    "-i",
                    str(frame_dir / "frame-%04d.png"),
                    "-c:v",
                    "libvpx-vp9",
                    "-pix_fmt",
                    "yuva420p",
                    # Alternate reference frames are incompatible with the
                    # alpha plane in libvpx; without this the channel is
                    # silently dropped.
                    "-auto-alt-ref",
                    "0",
                    "-crf",
                    "24",
                    "-b:v",
                    "0",
                    "-deadline",
                    "good",
                    "-cpu-used",
                    "1",
                    "-row-mt",
                    "1",
                    "-an",
                    "-metadata:s:v:0",
                    "alpha_mode=1",
                    "-color_range",
                    "tv",
                    "-colorspace",
                    "bt709",
                    "-color_primaries",
                    "bt709",
                    "-color_trc",
                    "bt709",
                    str(out),
                ]
            )

        for frame_dir, mp4, webm in (
            (light_dir, light_mp4, light_webm),
            (dark_dir, dark_mp4, dark_webm),
        ):
            source_pattern = str(frame_dir / "frame-%04d.png")
            run_ffmpeg(
                [
                    "-framerate",
                    str(FPS),
                    "-i",
                    source_pattern,
                    "-c:v",
                    "libx264",
                    "-preset",
                    "medium",
                    "-crf",
                    "18",
                    "-pix_fmt",
                    "yuv420p",
                    # Tag the colour range and matrix explicitly. Untagged, a
                    # browser guesses — and its video compositor guessed
                    # differently from its canvas path, so the flat #f0f0f0
                    # backdrop composited a shade off the page and the cutout
                    # showed as a pale rectangle behind her.
                    "-color_range",
                    "tv",
                    "-colorspace",
                    "bt709",
                    "-color_primaries",
                    "bt709",
                    "-color_trc",
                    "bt709",
                    "-movflags",
                    "+faststart",
                    str(mp4),
                ]
            )
            run_ffmpeg(
                [
                    "-framerate",
                    str(FPS),
                    "-i",
                    source_pattern,
                    "-c:v",
                    "libvpx-vp9",
                    "-crf",
                    "32",
                    "-b:v",
                    "0",
                    "-an",
                    # Same tagging as the H.264 encode above.
                    "-color_range",
                    "tv",
                    "-colorspace",
                    "bt709",
                    "-color_primaries",
                    "bt709",
                    "-color_trc",
                    "bt709",
                    str(webm),
                ]
            )

    print(light_alpha)
    print(dark_alpha)
    print(light_mp4)
    print(light_webm)
    print(dark_mp4)
    print(dark_webm)


if __name__ == "__main__":
    main()
