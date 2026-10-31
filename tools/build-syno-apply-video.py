#!/usr/bin/env python3
"""Render the Syno application walkthrough from approved Figma screenshots.

The screenshots are long page exports. This script reconstructs a viewport so
the navigation and bottom action stay fixed while only the content scrolls.
"""

from __future__ import annotations

import math
import os
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
FIGMA = ROOT / "assets-syno-figma"
FILMS = ROOT / "assets-syno-case" / "films"
PHOTOS = ROOT / "syno-prototype" / "photos"
FONT = ROOT / "syno-prototype" / "fonts" / "schengen" / "A-Regular.woff2"
FPS = 30
DURATION = 10.7
WORKS_END = 2.8
QUESTIONS_END = 5.6
REVIEW_END = 8.4


def ease(value: float) -> float:
    value = min(1.0, max(0.0, value))
    return value * value * (3.0 - 2.0 * value)


def scroll_at(t: float, limit: int, flicks: tuple[tuple[float, float, float, float], ...]) -> int:
    """Move in short decelerating gestures instead of one slow linear pan."""
    position = 0.0
    for start, end, before, after in flicks:
        if t < start:
            break
        if t < end:
            progress = min(1.0, max(0.0, (t - start) / (end - start)))
            position = before + (after - before) * (1 - (1 - progress) ** 3)
            break
        position = after
    return round(limit * position)


WORKS_FLICKS = ((1.26, 1.60, 0.0, 0.54), (1.82, 2.18, 0.54, 1.0))
MOBILE_WORKS_FLICKS = ((0.82, 1.13, 0.0, 0.22), (1.69, 2.18, 0.22, 1.0))
QUESTIONS_FLICKS = ((3.85, 4.15, 0.0, 0.62), (4.94, 5.19, 0.62, 1.0))
REVIEW_FLICKS = ((5.88, 6.25, 0.0, 0.34), (6.46, 6.88, 0.34, 0.68),
                 (7.08, 7.69, 0.68, 1.0))

WORKS = (
    ("Salt Lines", "2024 · Installation", "empty-art-coastal-installation-landscape.jpg"),
    ("Tidal Archive", "2024 · Installation", "empty-art-blue-textile-portrait.jpg"),
    ("Harbour Studios", "2024 · Installation", "profile-work-2.png"),
    ("Blue Passage", "2023 · Sculpture", "empty-art-green-resin-square.jpg"),
    ("Coastal Drift", "2022 · Installation", "empty-art-sound-installation-landscape.jpg"),
    ("Field Notes", "2022 · Ceramics", "empty-art-ceramics-square.jpg"),
)

ANSWERS = (
    "Born and raised in Limassol, I live and work in Nicosia; my practice is rooted in the Cypriot coastal landscape.",
    "Salt Lines and Tidal Archive explore memory and movement through materials gathered along the coast.",
)


def work_photo(key: str) -> Image.Image:
    return Image.open(PHOTOS / key).convert("RGB")


def work_check(draw: ImageDraw.ImageDraw, x: int, y: int, selected: bool, size: int) -> None:
    draw.rounded_rectangle((x, y, x + size, y + size), radius=max(3, size // 5),
                           fill="#1c1c1c" if selected else "#ffffff",
                           outline="#1c1c1c" if selected else "#999999", width=1)
    if selected:
        draw.line((x + size * .23, y + size * .50, x + size * .43, y + size * .70,
                   x + size * .78, y + size * .30), fill="white", width=max(2, size // 8), joint="curve")


def clean_work_cards(source: Image.Image, mobile: bool, selected_count: int,
                     hover_index: int = -1) -> Image.Image:
    """Replace uneven demo cards with one grid and artwork from the Syno media set."""
    image = source.copy()
    draw = ImageDraw.Draw(image)
    border = (174, 173, 170)
    blue = (199, 224, 242)
    hover_grey = (220, 219, 217)  # --bg-hover in the Syno kit
    if mobile:
        title_font = ImageFont.truetype(str(FONT), 17)
        meta_font = ImageFont.truetype(str(FONT), 13)
        row_edges = (395, 675, 955, 1235, 1513, 1791, 2043)
        draw.rectangle((28, 337, 130, 370), fill=image.getpixel((150, 350)))
        draw.text((29, 345), f"{selected_count} SELECTED", font=meta_font,
                  fill="#2874a0" if selected_count else "#b05245", anchor="lt")
        for index, (title, meta, key) in enumerate(WORKS):
            selected = index < selected_count
            top, bottom = row_edges[index:index + 2]
            fill = hover_grey if index == hover_index else blue if selected else "white"
            draw.rectangle((19, top + 1, 355, bottom - 1), fill=fill)
            photo = ImageOps.fit(work_photo(key), (306, 190), Image.Resampling.LANCZOS)
            image.paste(photo, (29, top + 11))
            work_check(draw, 312, top + 22, selected, 17)
            draw.text((29, top + 211), title, font=title_font, fill="#1c1c1c", anchor="lt")
            draw.text((29, top + (230 if index == 5 else 240)), meta,
                      font=meta_font, fill="#303030", anchor="lt")
        draw.line((18, 395, 356, 395), fill=border, width=1)
        for y in row_edges[1:-1]:
            draw.line((18, y, 356, y), fill=border, width=1)
        draw.line((18, 395, 18, 2042), fill=border, width=1)
        draw.line((356, 395, 356, 2042), fill=border, width=1)
        return image

    # The original export shows a thin slice of the next row above the sticky
    # action bar. Extend the content so the first row ends exactly at that bar;
    # the second row then enters naturally as the page scrolls.
    image = Image.new("RGB", (1920, 1580), (229, 228, 226))
    image.paste(source.crop((0, 0, 1920, 515)), (0, 0))
    image.paste(source.crop((0, source.height - 115, 1920, source.height)), (0, 1465))
    draw = ImageDraw.Draw(image)
    draw.rectangle((40, 515, 1880, 1464), fill="white")
    draw.line((40, 515, 40, 1464), fill=border, width=1)
    draw.line((1880, 515, 1880, 1464), fill=border, width=1)

    title_font = ImageFont.truetype(str(FONT), 25)
    meta_font = ImageFont.truetype(str(FONT), 21)
    columns = (663, 1063, 1463, 1862)
    rows = (515, 989, 1465)
    draw.rectangle((661, 422, 846, 479), fill=image.getpixel((900, 450)))
    draw.text((663, 439), f"{selected_count} selected", font=meta_font,
              fill="#2874a0" if selected_count else "#b05245", anchor="lt")
    for index, (title, meta, key) in enumerate(WORKS):
        selected = index < selected_count
        col, row = index % 3, index // 3
        left, right = columns[col:col + 2]
        top = rows[row]
        fill = hover_grey if index == hover_index else blue if selected else "white"
        draw.rectangle((left + 1, top + 1, right - 1, rows[row + 1] - 1), fill=fill)
        photo = ImageOps.fit(work_photo(key), (362, 340), Image.Resampling.LANCZOS)
        image.paste(photo, (left + 18, top + 20))
        work_check(draw, left + 352, top + 36, selected, 22)
        draw.text((left + 18, top + 376), title, font=title_font, fill="#1c1c1c", anchor="lt")
        draw.text((left + 18, top + 416), meta, font=meta_font, fill="#303030", anchor="lt")
    draw.line((663, 515, 1862, 515), fill=border, width=1)
    draw.line((663, 989, 1862, 989), fill=border, width=1)
    for x in columns:
        draw.line((x, 515, x, 1464), fill=border, width=1)
    return image


def clean_review(source: Image.Image, mobile: bool) -> Image.Image:
    """Keep the review consistent with the two works selected in the film."""
    image = source.copy()
    draw = ImageDraw.Draw(image)
    if mobile:
        grey = image.getpixel((250, 970))
        draw.rectangle((19, 671, 355, 1002), fill=grey)
        first = ImageOps.fit(work_photo(WORKS[0][2]), (269, 213), Image.Resampling.LANCZOS)
        second = ImageOps.fit(work_photo(WORKS[1][2]), (269, 213), Image.Resampling.LANCZOS)
        image.paste(first, (34, 684))
        image.paste(second.crop((0, 0, 41, 213)), (315, 684))
        font = ImageFont.truetype(str(FONT), 16)
        small = ImageFont.truetype(str(FONT), 14)
        draw.text((34, 910), WORKS[0][0], font=font, fill="#1c1c1c", anchor="lt")
        draw.text((34, 938), WORKS[0][1], font=small, fill="#303030", anchor="lt")
        draw.text((315, 910), WORKS[1][0], font=font, fill="#1c1c1c", anchor="lt")
        draw.text((315, 938), WORKS[1][1], font=small, fill="#303030", anchor="lt")
        return image

    grey = image.getpixel((900, 1350))
    draw.rectangle((665, 913, 1863, 1414), fill=grey)
    draw.line((1862, 913, 1862, 1414), fill=(174, 173, 170), width=1)
    font = ImageFont.truetype(str(FONT), 24)
    small = ImageFont.truetype(str(FONT), 20)
    for index, x in enumerate((687, 1283)):
        title, meta, key = WORKS[index]
        photo = ImageOps.fit(work_photo(key), (558, 320), Image.Resampling.LANCZOS)
        image.paste(photo, (x, 933))
        draw.text((x, 1273), title, font=font, fill="#1c1c1c", anchor="lt")
        draw.text((x, 1315), meta, font=small, fill="#303030", anchor="lt")
    return image


def blank_questions(source: Image.Image, mobile: bool) -> Image.Image:
    image = source.copy()
    draw = ImageDraw.Draw(image)
    if mobile:
        boxes = ((39, 428, 335, 521), (39, 602, 335, 839), (39, 945, 335, 1054))
        counters = ((28, 535, 126, 555), (28, 852, 126, 873), (28, 1068, 126, 1088))
        background = image.getpixel((150, 515))
        page = image.getpixel((150, 552))
    else:
        boxes = ((680, 513, 1845, 647), (680, 780, 1845, 914), (680, 1048, 1845, 1182))
        counters = ((661, 672, 813, 707), (661, 941, 813, 976), (661, 1208, 813, 1243))
        background = image.getpixel((1000, 630))
        page = image.getpixel((1000, 690))
    for box in boxes:
        draw.rectangle(box, fill=background)
    for box in counters:
        draw.rectangle(box, fill=page)
    return image


def wrap_words(draw: ImageDraw.ImageDraw, value: str, font: ImageFont.FreeTypeFont,
               max_width: int) -> list[str]:
    lines = [""]
    for word in value.split(" "):
        candidate = (lines[-1] + " " + word).strip()
        if lines[-1] and draw.textlength(candidate, font=font) > max_width:
            lines.append(word)
        else:
            lines[-1] = candidate
    return lines


def question_state(source: Image.Image, t: float, mobile: bool) -> Image.Image:
    image = source.copy()
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(str(FONT), 16 if mobile else 24)
    counter_font = ImageFont.truetype(str(FONT), 14 if mobile else 20)
    fields = ((3.03, 3.77, ANSWERS[0], 400), (4.23, 4.91, ANSWERS[1], 800))
    x = 41 if mobile else 681
    starts = (431, 608) if mobile else (518, 784)
    count_y = (539, 856) if mobile else (677, 946)
    line_height = 21 if mobile else 32
    width = 288 if mobile else 1140
    for index, (start, end, full, limit) in enumerate(fields):
        count = round(len(full) * ease((t - start) / (end - start)))
        value = full[:count]
        if value:
            lines = wrap_words(draw, value, font, width)
            for row, line in enumerate(lines):
                draw.text((x, starts[index] + row * line_height), line,
                          font=font, fill="#1c1c1c", anchor="lt")
            if t < end:
                caret_x = x + draw.textlength(lines[-1], font=font) + 2
                caret_y = starts[index] + (len(lines) - 1) * line_height + 2
                draw.line((caret_x, caret_y, caret_x, caret_y + (17 if mobile else 24)),
                          fill="#367fa8", width=2)
        draw.text((x, count_y[index]), f"{count} / {limit}", font=counter_font,
                  fill="#4a4a4a", anchor="lt")
    draw.text((x, 1072 if mobile else 1214), "0 / 800", font=counter_font,
              fill="#4a4a4a", anchor="lt")
    return image


def click_ring(frame: Image.Image, x: int, y: int, strength: float, radius: int) -> None:
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    alpha = round(120 * strength)
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(48, 125, 171, alpha))
    draw.ellipse((x - radius - 9, y - radius - 9, x + radius + 9, y + radius + 9), outline=(48, 125, 171, alpha), width=3)
    frame.paste(overlay, (0, 0), overlay)


def cursor(frame: Image.Image, x: int, y: int) -> None:
    draw = ImageDraw.Draw(frame)
    points = [(x, y), (x + 2, y + 27), (x + 8, y + 21), (x + 15, y + 34),
              (x + 20, y + 31), (x + 13, y + 18), (x + 24, y + 17)]
    draw.polygon(points, fill="white")
    draw.line(points + [points[0]], fill="#1b1b1b", width=3, joint="curve")


def desktop_view(source: Image.Image, offset: int) -> Image.Image:
    width, height = 1920, 1104
    header, sidebar, footer = 200, 663, 115
    body_bottom = height - footer
    view = Image.new("RGB", (width, height), "#e7e7e7")
    view.paste(source.crop((0, 0, width, header)), (0, 0))
    view.paste(source.crop((0, header, sidebar, body_bottom)), (0, header))
    view.paste(source.crop((sidebar, header + offset, width, body_bottom + offset)), (sidebar, header))
    view.paste(source.crop((0, source.height - footer, width, source.height)), (0, body_bottom))
    return view


def mobile_view(source: Image.Image, offset: int, header: int, footer: int) -> Image.Image:
    width, height = 375, 812
    body_bottom = height - footer
    view = Image.new("RGB", (width, height), "#e7e7e7")
    view.paste(source.crop((0, 0, width, header)), (0, 0))
    view.paste(source.crop((0, header + offset, width, body_bottom + offset)), (0, header))
    view.paste(source.crop((0, source.height - footer, width, source.height)), (0, body_bottom))
    return view


def render_frame(t: float, mobile: bool, images: dict[str, Image.Image]) -> Image.Image:
    if mobile:
        if t < WORKS_END:
            selected = 0 if t < 0.56 else 1 if t < 1.47 else 2
            hover = 0 if .25 <= t < .56 else 1 if 1.18 <= t < 1.47 else -1
            source = images[f"works{selected}hover{hover}"]
            max_scroll = source.height - 812
            offset = scroll_at(t, max_scroll, MOBILE_WORKS_FLICKS)
            image = mobile_view(source, offset, 176, 63)
            for index, start, end, click in ((0, .25, .56, .55), (1, 1.18, 1.47, 1.46)):
                if start <= t <= end:
                    top = (395 if index == 0 else 675) - offset
                    cursor(image, 309, top + 16)
                    if abs(t - click) <= .13:
                        click_ring(image, 320, top + 22, 1 - abs(t - click) / .13, 11)
            click_time, target = 2.55, (323, 779)
        elif t < QUESTIONS_END:
            source = question_state(images["questions_blank"], t, True)
            max_scroll = source.height - 812
            image = mobile_view(source, scroll_at(t, max_scroll, QUESTIONS_FLICKS), 162, 65)
            for click, point in ((2.99, (58, 449)), (4.20, (58, 326))):
                if abs(t - click) <= .12:
                    click_ring(image, *point, 1 - abs(t - click) / .12, 11)
            click_time, target = 5.36, (323, 779)
        elif t < REVIEW_END:
            source = images["review"]
            max_scroll = source.height - 812
            image = mobile_view(source, scroll_at(t, max_scroll, REVIEW_FLICKS), 169, 98)
            click_time, target = 8.15, (278, 780)
        else:
            image = images["submitted"].crop((0, 0, 375, 812)).copy()
            click_time, target = -10.0, (0, 0)
        delta = t - click_time
        if -0.15 <= delta <= 0.14:
            click_ring(image, *target, 1 - abs(delta) / 0.15, 15)
        return image.resize((374, 812), Image.Resampling.LANCZOS)

    if t < WORKS_END:
        selected = 0 if t < .56 else 1 if t < 1.08 else 2
        hover = 0 if .28 <= t < .56 else 1 if .80 <= t < 1.08 else -1
        source = images[f"works{selected}hover{hover}"]
        max_scroll = source.height - 1104
        stage = desktop_view(source, scroll_at(t, max_scroll, WORKS_FLICKS))
        for index, start, end, click in ((0, .28, .56, .55), (1, .80, 1.08, 1.07)):
            if start <= t <= end:
                left = 663 + index * 400
                cursor(stage, left + 345, 533)
                if abs(t - click) <= .12:
                    click_ring(stage, left + 363, 553, 1 - abs(t - click) / .12, 15)
        click_time, target = 2.55, (1828, 1035)
    elif t < QUESTIONS_END:
        source = question_state(images["questions_blank"], t, False)
        max_scroll = source.height - 1104
        stage = desktop_view(source, scroll_at(t, max_scroll, QUESTIONS_FLICKS))
        for click, point in ((2.99, (717, 532)), (4.20, (717, 548))):
            if abs(t - click) <= .12:
                click_ring(stage, *point, 1 - abs(t - click) / .12, 15)
        click_time, target = 5.36, (1828, 1035)
    elif t < REVIEW_END:
        source = images["review"]
        max_scroll = source.height - 1104
        stage = desktop_view(source, scroll_at(t, max_scroll, REVIEW_FLICKS))
        click_time, target = 8.15, (1764, 1035)
    else:
        stage = images["submitted"].copy()
        # Align the blue/artwork and grey/rule rows to 4:2:0 chroma pairs. A
        # one-pixel border at an odd row blended blue into the apparent gap.
        draw = ImageDraw.Draw(stage)
        stage.paste(stage.crop((40, 1016, 960, 1017)), (40, 1017))
        draw.line((30, 1018, 1890, 1018), fill=(174, 173, 170), width=2)
        # The Figma export lets the side rails continue below the footer rule.
        # End both rails at the rule so the right-hand endcap stays a clean T.
        draw.rectangle((39, 1074, 40, 1082), fill=(229, 228, 226))
        draw.rectangle((1879, 1074, 1880, 1082), fill=(229, 228, 226))
        click_time, target = -10.0, (0, 0)

    frame = stage
    delta = t - click_time
    if -0.38 <= delta <= 0.12:
        progress = ease((delta + 0.38) / 0.28)
        px = round(target[0] - 120 * (1 - progress))
        py = round(target[1] - 36 * (1 - progress))
        cursor(frame, px, py)
    if -0.1 <= delta <= 0.12:
        click_ring(frame, *target, 1 - abs(delta) / 0.12, 15)
    return frame


def load_images(mobile: bool) -> dict[str, Image.Image]:
    suffix = "mobile" if mobile else "desktop"
    names = {name: FIGMA / f"apply-{name}-{suffix}.png" for name in ("works", "questions", "review", "submitted")}
    images = {name: Image.open(path).convert("RGB") for name, path in names.items()}
    if not mobile:
        images = {name: img.resize((1920, round(img.height * 1920 / img.width)), Image.Resampling.LANCZOS)
                  for name, img in images.items()}
        assert images["submitted"].size == (1920, 1104)
    images["review"] = clean_review(images["review"], mobile)
    images["questions_blank"] = blank_questions(images["questions"], mobile)
    for selected in range(3):
        images[f"works{selected}hover-1"] = clean_work_cards(images["works"], mobile, selected)
    images["works0hover0"] = clean_work_cards(images["works"], mobile, 0, 0)
    images["works1hover1"] = clean_work_cards(images["works"], mobile, 1, 1)
    return images


def encode(mobile: bool) -> None:
    images = load_images(mobile)
    stem = "syno-flow-apply-figma-mobile" if mobile else "syno-flow-apply-figma"
    target = FILMS / f"{stem}.mp4"
    temp = FILMS / f"{stem}.rendering.mp4"
    poster = FILMS / f"{stem}-poster.jpg"
    width, height = (374, 812) if mobile else (1920, 1104)
    frame_count = math.ceil(DURATION * FPS)
    command = ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{width}x{height}",
               "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "veryfast",
               "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-loglevel", "error", str(temp)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        for index in range(frame_count):
            frame = render_frame(index / FPS, mobile, images)
            if index == 0:
                frame.save(poster, quality=90)
            assert process.stdin is not None
            process.stdin.write(frame.tobytes())
        process.stdin.close()
        if process.wait() != 0:
            raise RuntimeError(f"ffmpeg failed for {target}")
        os.replace(temp, target)
        print(f"Rendered {target.relative_to(ROOT)} ({frame_count / FPS:.2f}s)")
    except Exception:
        process.kill()
        process.wait()
        temp.unlink(missing_ok=True)
        raise


if __name__ == "__main__":
    FILMS.mkdir(parents=True, exist_ok=True)
    encode(False)
    encode(True)
