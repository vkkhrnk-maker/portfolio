# Card / slider layout rules (mobile case studies)

How the screen mockups inside a case study (`hooh.html`, `itab.html`,
`hooh-fill.html`) are laid out on **mobile (≤640px)**. Keep new case
pages consistent with this.

## Structure

Each `figure.case__figure` holds two things:

```html
<figure class="case__figure">
  <!-- DESKTOP (>640px): the flat side-by-side composition -->
  <picture class="case__figure-desktop"><img src="…composite.webp"></picture>

  <!-- MOBILE (≤640px): a horizontal swipe slider of the individual screens -->
  <div class="case__slider">
    <div class="case__slide"><img class="case__shot case__shot--phone"  src="…s1.webp"></div>
    <div class="case__slide"><img class="case__shot case__shot--desktop" src="…s2.webp"></div>
  </div>

  <figcaption>…</figcaption>
</figure>
```

- `>640px` → `.case__figure-desktop` is shown, `.case__slider` is hidden.
- `≤640px` → `.case__figure-desktop` is hidden, `.case__slider` is shown.

The slider images are **separate files from the desktop composite** — slice
each screen out of the composition into its own `…-s1/-s2/…webp`. The desktop
composite is never touched by mobile changes.

## The card (frame)

Every `.case__slide` is one uniform **frame**:

- Width `94%` of the slider (the neighbouring slide peeks ~**20px**).
- **Definite landscape height `63vw`** — NOT `aspect-ratio`. WebKit does not
  treat an `aspect-ratio` height as definite, so `%`/`object-fit` sizing on the
  child silently breaks (screen overflows & crops). Always give the frame a real
  height.
- Content-box aspect ≈ **1.5** → desktop screens fill the frame, and **every**
  screen (phone or desktop) lands at the **same height** → identical top/bottom
  margins.
- Uniform **12px inset** on all sides — nothing touches the edge.
- Background `rgb(227,229,230)` (matches the screens' own backdrop, seamless).
- **No rounded corners** — see the convention below.

## Screen types (the `--modifier` on `.case__shot`)

| Modifier            | Use for                                  | Behaviour |
|---------------------|------------------------------------------|-----------|
| `--phone`           | a device mockup (vertical phone)         | `object-fit: contain`; centred; keeps the 12px+ margin on every side. Comes out narrower than the card — that's expected. |
| `--desktop`         | a horizontal desktop / web screen        | fills the card width up to the inset; centred vertically. |
| `--fill`            | a full-bleed background plate (e.g. the gradient category panel) | `object-fit: cover`, absolutely positioned `inset:0` — the image **is** the whole card background, bleeds all edges. |
| `--phone` + slide `--feed` | a vertical scroll feed (stack of cards) | fills the card height and **bleeds off the top & bottom** edges (no top/bottom margin) so it reads as a continuous feed; side margins stay. Add `case__slide--feed` to the slide `<div>`. |

### RULES

1. **A device (phone) always keeps a margin on every side** — never flush to
   the edge.
2. **All screens share one height** (vertical phones and horizontal desktops
   alike) → their top/bottom margins read the same. Phones therefore come out
   narrower (more grey on the sides) — that is intended.
3. **One full-bleed exception per swipe set is OK** (`--fill` / `--feed`): a
   feed or a gradient plate may bleed to the edge on purpose.
4. **No rounded corners on any plate / card / frame.** Every backing surface
   (hero cover, figure frames, slider frames, outcome panel, split panes, image
   plates) uses `border-radius: 0`. Pills/buttons keep their own radius — this
   rule is about plates.

## Hero / cover

The hero image (`case-*-hero.webp`) is the **complete scene** (device + gradient
+ clouds baked in). It fills the whole `.case__hero-image` frame — do **not**
add a separate CSS gradient or separate cloud layers on top, or you get
"gradient on gradient" + doubled clouds.

## Header (mobile topbar)

`.mobile-topbar` = the name on the left (links to `index.html` = home) and
`Menu` on the right. The name uses `white-space: nowrap` so it can't wrap and
shove `Menu` out of place.
