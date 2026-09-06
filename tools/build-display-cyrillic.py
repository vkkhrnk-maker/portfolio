#!/usr/bin/env python3
"""Build the Russian page's display face from Noto Serif Display.

PP Editorial New has 463 glyphs and not one of them is Cyrillic, so Russian
headings used to fall through to Georgia. The first attempt at a fix paired
the two faces — Editorial New for Latin, Noto for Cyrillic — and it failed
visibly: Editorial New's ratio of cap height to x-height is 1.418, Noto's is
1.284, so no single multiplier can align both. Matched on x-height, Latin caps
sat 11% too tall, and Editorial New's hairline contrast made words like
"Figma" read as a second typeface mid-sentence.

So the two languages are separated instead of blended. The English page keeps
Editorial New alone; the Russian page uses this face alone, for both alphabets.
Nothing is ever mixed in one line, and the mismatch cannot occur.

    width axis  wdth 70   Editorial New sets 'o' at 0.493 em; Noto Serif
                          Display at wdth 70 sets it at 0.492, so the Russian
                          page keeps the English page's measure and the
                          layout needs no second set of breakpoints.
    size-adjust 101.6%    lifts Noto's 0.555 em x-height onto Editorial New's
                          0.564 em, so the two language versions read at the
                          same optical size. Applied in the @font-face rule.

The subset therefore carries Latin as well as Cyrillic: brand names (Hooh,
iTAB, Syno), the wordmark and words like HTML all sit on the Russian page.

    python3 tools/build-display-cyrillic.py

Writes fonts/NotoSerifDisplay-Cond.woff2. Needs `fonttools[woff]` and
`brotli`; the source is fetched from Google Fonts, so it needs the network.
"""
import os
import subprocess
import sys
import tempfile
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "fonts", "NotoSerifDisplay-Cond.woff2")

# The upstream variable font, whole. The Google Fonts CSS API serves one file
# per script, and this face needs Latin and Cyrillic in a single file — so the
# source is the repository TTF, which also keeps the width axis intact for us
# to pin rather than accepting the default 100.
SRC_URL = (
    "https://raw.githubusercontent.com/google/fonts/main/ofl/"
    "notoserifdisplay/NotoSerifDisplay%5Bwdth,wght%5D.ttf"
)

WIDTH = 70          # matches Editorial New's set width

# Latin and Cyrillic, plus the punctuation both alphabets need. Kept tight —
# no Greek, no Vietnamese, no Cyrillic Extended.
UNICODES = ",".join([
    "U+0020-007E",                  # basic Latin
    "U+00A0-00FF",                  # Latin-1: accents, guillemets, ©, °
    "U+0301",                       # combining acute (Russian stress marks)
    "U+0400-045F,U+0490-0491,U+04B0-04B1",   # Cyrillic
    "U+2010-2027",                  # dashes, quotes, ellipsis
    "U+2030,U+2032-2033,U+2039-203A,U+2044",
    "U+20AC,U+2116,U+2122",         # €, №, ™
])


def fetch(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main():
    try:
        from fontTools.ttLib import TTFont
        from fontTools.varLib.instancer import instantiateVariableFont
    except ImportError:
        sys.exit("pip install 'fonttools[woff]' brotli")

    print(f"source  {SRC_URL.rsplit('/', 1)[-1]}")

    with tempfile.TemporaryDirectory() as tmp:
        var = os.path.join(tmp, "var.ttf")
        with open(var, "wb") as fh:
            fh.write(fetch(SRC_URL))

        font = TTFont(var)
        axes = {a.axisTag: (a.minValue, a.maxValue) for a in font["fvar"].axes}
        if "wdth" not in axes:
            sys.exit(f"expected a wdth axis, got {sorted(axes)}")
        lo, hi = axes["wdth"]
        if not lo <= WIDTH <= hi:
            sys.exit(f"wdth {WIDTH} is outside the font's {lo}..{hi}")

        instantiateVariableFont(font, {"wdth": WIDTH}, inplace=True)
        pinned = os.path.join(tmp, "pinned.ttf")
        font.save(pinned)

        subprocess.run(
            [
                sys.executable, "-m", "fontTools.subset", pinned,
                f"--unicodes={UNICODES}",
                "--layout-features=kern,liga,calt,locl",
                "--flavor=woff2",
                "--no-hinting",
                "--desubroutinize",
                # The subsetter drops most name records, licence included.
                # This repository is public, so the .woff2 is redistributed and
                # the OFL travels with it: 0 copyright, 13 licence, 14 its URL.
                "--name-IDs+=0,13,14",
                f"--output-file={OUT}",
            ],
            check=True,
        )

    out = TTFont(OUT)
    upm = out["head"].unitsPerEm
    cmap = out.getBestCmap()

    # This face carries the whole Russian page, so both alphabets have to be
    # there — a Cyrillic-only subset is what broke the first attempt.
    required = ("АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ"
                "абвгдеёжзийклмнопрстуфхцчшщъыьэюя"
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                "abcdefghijklmnopqrstuvwxyz"
                "0123456789«»—–…№")
    missing = [c for c in required if ord(c) not in cmap]
    if missing:
        sys.exit(f"subset dropped required characters: {''.join(missing)}")

    o_adv = out["hmtx"][cmap[ord("о")]][0] / upm
    print(f"written {os.path.relpath(OUT, ROOT)}  "
          f"{os.path.getsize(OUT) / 1024:.1f} KB, {len(cmap)} glyphs")
    print(f"        'о' advance {o_adv:.3f} em × 1.016 size-adjust "
          f"= {o_adv * 1.016:.3f} (Editorial New: 0.493)")


if __name__ == "__main__":
    main()
