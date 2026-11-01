#!/usr/bin/env python3
"""Build the Save walkthrough: guest saves from the homepage, creates an account, comes back
to the same card already saved, then finds it alone in the new account's Favourites.

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
        "home-card", "home-hover", "guest-gate", "gate-hover", "signup", "signup-hover",
        "welcome", "welcome-hover", "home-saved", "home-saved-clean", "chip-hover", "menu", "menu-hover", "favourites")}
    scroll = [load(SOURCE / f"scroll-{i:02d}.png") for i in range(1, 15)]
    typing = [load(SOURCE / f"name-{i:02d}.png") for i in range(0, c["typed"] + 1)]
    s["guest-gate"].save(POSTER, quality=94, subsampling=0)
    heart, cont, google, name, done, chip, fav, beside = (at(c[k]) for k in (
        "heart", "continue", "google", "name", "welcome", "chip", "favourites", "rest"))
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
    # The gate promises a free account, so sign-up comes first.
    f.fade(s["gate-hover"], s["signup"], 0.14, cont)
    f.hold(s["signup"], 0.25, cont)
    f.move(s["signup"], cont, google, 0.4, swap=(0.85, s["signup-hover"]))
    f.hold(s["signup-hover"], 0.2, google)
    f.click(s["signup-hover"], google)
    # The name is the one thing a new account owes.
    f.fade(s["signup-hover"], s["welcome"], 0.14, google)
    f.hold(s["welcome"], 0.2, google)
    f.move(s["welcome"], google, name, 0.35)
    f.click(typing[0], name)
    for frame in typing:
        f.emit(frame, name)
        f.emit(frame, name)
    f.hold(typing[-1], 0.2, name)
    f.move(typing[-1], name, done, 0.35, swap=(0.85, s["welcome-hover"]))
    f.hold(s["welcome-hover"], 0.2, done)
    f.click(s["welcome-hover"], done)
    # Back on the same card, already saved.
    f.fade(s["welcome-hover"], s["home-saved"], 0.14, done)
    f.move(s["home-saved"], done, beside, 0.5)
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
    # The new account holds exactly what was saved.
    f.fade(s["menu-hover"], s["favourites"], 0.14, fav)
    f.hold(s["favourites"], 2.2, fav)
    f.close()


if __name__ == "__main__":
    main()
