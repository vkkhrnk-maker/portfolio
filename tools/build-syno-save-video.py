#!/usr/bin/env python3
"""Build the Save walkthrough: guest saves from the homepage, signs in, comes back
to the same card already saved, then finds it first in Favourites.

Frames are real browser captures from tools/capture-syno-save.mjs.
"""
from __future__ import annotations

from pathlib import Path
import json

from syno_film import Film, at, load

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets-syno-case/films/source-save"
DEST = ROOT / "assets-syno-case/films"
OUT = DEST / "syno-flow-save.mp4"
POSTER = DEST / "syno-flow-save-poster.jpg"


def main() -> None:
    c = json.loads((SOURCE / "coords.json").read_text())
    s = {n: load(SOURCE / f"{n}.png") for n in (
        "home-card", "home-hover", "guest-gate", "gate-hover", "login", "login-hover", "home-saved",
        "home-saved-clean", "chip-hover", "menu", "menu-hover", "favourites")}
    scroll = [load(SOURCE / f"scroll-{i:02d}.png") for i in range(1, 15)]
    s["guest-gate"].save(POSTER, quality=94, subsampling=0)
    heart, cont, google, chip, fav, beside = (at(c[k]) for k in ("heart", "continue", "google", "chip", "favourites", "rest"))
    start = (1240, 930)

    f = Film(OUT)
    # Save on a card, as a guest.
    f.hold(s["home-card"], 0.3, start)
    f.move(s["home-card"], start, heart, 0.5, swap=(0.8, s["home-hover"]))
    f.hold(s["home-hover"], 0.25, heart)
    f.click(s["home-hover"], heart)
    # The gate explains and leads to sign-in.
    f.fade(s["home-hover"], s["guest-gate"], 0.12, heart)
    f.hold(s["guest-gate"], 0.25, heart)
    f.move(s["guest-gate"], heart, cont, 0.45, swap=(0.85, s["gate-hover"]))
    f.hold(s["gate-hover"], 0.3, cont)
    f.click(s["gate-hover"], cont)
    # Sign in.
    f.fade(s["gate-hover"], s["login"], 0.14, cont)
    f.hold(s["login"], 0.3, cont)
    f.move(s["login"], cont, google, 0.45, swap=(0.85, s["login-hover"]))
    f.hold(s["login-hover"], 0.3, google)
    f.click(s["login-hover"], google)
    # Back on the same card, already saved.
    f.fade(s["login-hover"], s["home-saved"], 0.14, google)
    f.move(s["home-saved"], google, beside, 0.5)
    f.hold(s["home-saved"], 1.1, beside)
    f.fade(s["home-saved"], s["home-saved-clean"], 0.12, beside)
    # Up to the account menu: the home header does not stick.
    for i, frame in enumerate(scroll):
        p = (i + 1) / len(scroll)
        ptr = (beside[0] + (chip[0] - beside[0]) * p, beside[1] + (chip[1] - beside[1]) * p)
        f.emit(frame, ptr)
        f.emit(frame, ptr)
    f.fade(scroll[-1], s["chip-hover"], 0.1, chip)
    f.hold(s["chip-hover"], 0.3, chip)
    f.click(s["chip-hover"], chip)
    f.fade(s["chip-hover"], s["menu"], 0.08, chip)
    f.move(s["menu"], chip, fav, 0.4, swap=(0.85, s["menu-hover"]))
    f.hold(s["menu-hover"], 0.25, fav)
    f.click(s["menu-hover"], fav)
    # The saved event is first in Favourites.
    f.fade(s["menu-hover"], s["favourites"], 0.14, fav)
    f.hold(s["favourites"], 2.2, fav)
    f.close()


if __name__ == "__main__":
    main()
