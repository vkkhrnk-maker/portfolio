#!/usr/bin/env python3
"""Build the work editor walkthrough: profile, Edit profile, Works, Add a work,
three photos of one work landing in the uploader, the fields filled in, Save work and the new work on the profile.

Frames are real browser captures from tools/capture-syno-editor.mjs.
"""
from __future__ import annotations

from pathlib import Path
import json

from syno_film import Film, at, load

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets-syno-case/films/source-editor"
DEST = ROOT / "assets-syno-case/films"
OUT = DEST / "syno-flow-editor.mp4"
POSTER = DEST / "syno-flow-editor-poster.jpg"


def main() -> None:
    c = json.loads((SOURCE / "coords.json").read_text())
    names = ("profile", "edit-hover", "main", "rail-hover", "works", "row-hover", "row-done", "row-clean",
             "add-hover", "add", "zone-hover", "uploading", "files", "tile-hover", "make-hover", "tile-done",
             "title-hover", "title-focus", "year-hover", "year-focus")
    s = {n: load(SOURCE / f"{n}.png") for n in names}
    title_keys = [load(SOURCE / f"title-{i:02d}.png") for i in range(1, 10)]
    year_keys = [load(SOURCE / f"year-{i:02d}.png") for i in range(1, 5)]
    row_keys = [load(SOURCE / f"row-{i:02d}.png") for i in range(1, 13)]
    fly = [load(SOURCE / f"fly-{i:02d}.png") for i in range(1, 15)]
    s["files"].save(POSTER, quality=94, subsampling=0)
    edit, rail, add, zone, title, year, grip, grip_to = (at(c[k]) for k in ("edit", "rail", "add", "zone", "title", "year", "grip", "gripTo"))
    tile, make = at(c["tile"]), at(c["make"])
    start = (1200, 930)

    f = Film(OUT)
    f.hold(s["profile"], 0.4, start)
    f.move(s["profile"], start, edit, 0.5, swap=(0.85, s["edit-hover"]))
    f.hold(s["edit-hover"], 0.3, edit)
    f.click(s["edit-hover"], edit)
    f.fade(s["edit-hover"], s["main"], 0.16, edit)
    f.hold(s["main"], 0.2, edit)
    f.move(s["main"], edit, rail, 0.3, swap=(0.85, s["rail-hover"]))
    f.hold(s["rail-hover"], 0.3, rail)
    f.click(s["rail-hover"], rail)
    f.fade(s["rail-hover"], s["works"], 0.12, rail)
    f.hold(s["works"], 0.2, rail)
    # The order of works: the first one opens the portfolio.
    f.move(s["works"], rail, grip, 0.3, swap=(0.85, s["row-hover"]))
    f.hold(s["row-hover"], 0.15, grip)
    for i, frame in enumerate(row_keys):
        p = (i + 1) / len(row_keys)
        ptr = (grip[0], grip[1] + (grip_to[1] - grip[1]) * p)
        f.emit(frame, ptr)
    f.hold(row_keys[-1], 0.08, grip_to)
    f.fade(row_keys[-1], s["row-done"], 0.1, grip_to)
    f.hold(s["row-done"], 0.35, grip_to)
    f.fade(s["row-done"], s["row-clean"], 0.1, grip_to)
    f.move(s["row-clean"], grip_to, add, 0.3, swap=(0.85, s["add-hover"]))
    f.hold(s["add-hover"], 0.15, add)
    f.click(s["add-hover"], add)
    f.fade(s["add-hover"], s["add"], 0.12, add)
    f.hold(s["add"], 0.3, add)
    f.move(s["add"], add, zone, 0.45, swap=(0.7, s["zone-hover"]))
    f.hold(s["zone-hover"], 0.35, zone)
    f.click(s["zone-hover"], zone)
    f.fade(s["zone-hover"], s["uploading"], 0.12, zone)
    f.hold(s["uploading"], 0.55, zone)
    f.fade(s["uploading"], s["files"], 0.2, zone)
    f.hold(s["files"], 0.3, zone)
    # Make cover: the photo flies to the first place.
    f.move(s["files"], zone, tile, 0.4, swap=(0.8, s["tile-hover"]))
    f.hold(s["tile-hover"], 0.2, tile)
    f.move(s["tile-hover"], tile, make, 0.2, swap=(0.5, s["make-hover"]))
    f.hold(s["make-hover"], 0.3, make)
    f.click(s["make-hover"], make)
    for frame in fly:
        f.emit(frame, make)
    f.hold(s["tile-done"], 0.7, make)
    f.move(s["tile-done"], make, title, 0.4, swap=(0.8, s["title-hover"]))
    f.hold(s["title-hover"], 0.3, title)
    f.click(s["title-hover"], title)
    f.emit(s["title-focus"], title)
    f.hold(s["title-focus"], 0.2, title)
    for frame in title_keys:
        f.hold(frame, 0.07, title)
    f.hold(title_keys[-1], 0.25, title)
    f.move(title_keys[-1], title, year, 0.35, swap=(0.8, s["year-hover"]))
    f.hold(s["year-hover"], 0.25, year)
    f.click(s["year-hover"], year)
    f.hold(s["year-focus"], 0.15, year)
    for frame in year_keys:
        f.hold(frame, 0.08, year)
    f.hold(year_keys[-1], 0.25, year)
    # Below the fold: the required Medium, sizes, materials, then Save work and the result.
    park = at(c["park"])
    medium, option, dims, mat, save, close = (at(c[k]) for k in ("medium", "option", "dims", "mat", "save", "close"))
    extra = {n: load(SOURCE / f"{n}.png") for n in ("park", "medium-hover", "medium-open", "option-hover", "medium-done", "dims-hover", "dims-focus", "mat-hover", "mat-focus", "park2", "save-hover", "saved", "list-clean", "close-hover", "back", "back-park", "end")}
    scroll_a = [load(SOURCE / f"scrollA-{i:02d}.png") for i in range(1, 13)]
    scroll_b = [load(SOURCE / f"scrollB-{i:02d}.png") for i in range(1, 10)]
    scroll_p = [load(SOURCE / f"scrollP-{i:02d}.png") for i in range(1, 23)]
    dims_keys = [load(SOURCE / f"dims-{i:02d}.png") for i in range(1, c["dimsLen"] + 1)]
    mat_keys = [load(SOURCE / f"mat-{i:02d}.png") for i in range(1, c["matLen"] + 1)]
    f.move(year_keys[-1], year, park, 0.3, swap=(0.3, extra["park"]))
    for frame in scroll_a:
        f.hold(frame, 0.05, park)
    f.hold(scroll_a[-1], 0.15, park)
    f.move(scroll_a[-1], park, medium, 0.35, swap=(0.8, extra["medium-hover"]))
    f.hold(extra["medium-hover"], 0.2, medium)
    f.click(extra["medium-hover"], medium)
    f.fade(extra["medium-hover"], extra["medium-open"], 0.1, medium)
    f.hold(extra["medium-open"], 0.3, medium)
    f.move(extra["medium-open"], medium, option, 0.3, swap=(0.8, extra["option-hover"]))
    f.hold(extra["option-hover"], 0.2, option)
    f.click(extra["option-hover"], option)
    f.fade(extra["option-hover"], extra["medium-done"], 0.1, option)
    f.hold(extra["medium-done"], 0.2, option)
    f.move(extra["medium-done"], option, dims, 0.3, swap=(0.8, extra["dims-hover"]))
    f.hold(extra["dims-hover"], 0.15, dims)
    f.click(extra["dims-hover"], dims)
    f.hold(extra["dims-focus"], 0.1, dims)
    for frame in dims_keys:
        f.hold(frame, 0.05, dims)
    f.hold(dims_keys[-1], 0.15, dims)
    f.move(dims_keys[-1], dims, mat, 0.3, swap=(0.8, extra["mat-hover"]))
    f.hold(extra["mat-hover"], 0.15, mat)
    f.click(extra["mat-hover"], mat)
    f.hold(extra["mat-focus"], 0.1, mat)
    for frame in mat_keys:
        f.hold(frame, 0.05, mat)
    f.hold(mat_keys[-1], 0.2, mat)
    f.move(mat_keys[-1], mat, park, 0.25, swap=(0.3, extra["park2"]))
    for frame in scroll_b:
        f.hold(frame, 0.05, park)
    f.hold(scroll_b[-1], 0.2, park)
    f.move(scroll_b[-1], park, save, 0.35, swap=(0.8, extra["save-hover"]))
    f.hold(extra["save-hover"], 0.3, save)
    f.click(extra["save-hover"], save)
    f.fade(extra["save-hover"], extra["saved"], 0.14, save)
    f.hold(extra["saved"], 1.5, save)
    f.fade(extra["saved"], extra["list-clean"], 0.14, save)
    f.move(extra["list-clean"], save, close, 0.4, swap=(0.8, extra["close-hover"]))
    f.hold(extra["close-hover"], 0.25, close)
    f.click(extra["close-hover"], close)
    f.fade(extra["close-hover"], extra["back"], 0.16, close)
    park_p = at(c["parkP"])
    f.move(extra["back"], close, park_p, 0.3, swap=(0.3, extra["back-park"]))
    for frame in scroll_p:
        f.hold(frame, 0.05, park_p)
    f.hold(extra["end"], 1.0, park_p)
    # The rest of the page: details, practice, CV.
    scroll_q = [load(SOURCE / f"scrollQ-{i:02d}.png") for i in range(1, 21)]
    for frame in scroll_q:
        f.hold(frame, 0.05, park_p)
    f.hold(load(SOURCE / "end2.png"), 1.6, park_p)
    f.close()


if __name__ == "__main__":
    main()
