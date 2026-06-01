# Card / slider layout rules (mobile case studies)

How the screen mockups inside a case study (`hooh.html`, `itab.html`) are laid
out on **mobile (≤640px)**. Keep new case pages consistent with this.

## The big idea

**Every plate is the same big size.** On mobile each screen sits on one
uniform grey plate — a tall portrait frame — and the screen is shown as large
as it fits inside. Phones fill the height; wide desktop screens fill the width.
The plate height never changes from block to block, so nothing ever looks like
a "runt" next to its neighbours.

There are three display modes:

| Screens in a block | Mode | Why |
|---|---|---|
| **1** | just the screen on a plate | nothing to swipe |
| **2+ (default)** | **slider** — horizontal swipe, one plate per screen, neighbours peek | one big uniform plate each; works for phones and desktops alike |
| a tight **flow** (steps of one sequence) | **slider too** | shown big and swiped in order (do NOT squeeze the steps into one tiny composite — each phone comes out as a "runt") |
| **2 screens where one must be full-width** (e.g. a tall narrow column of badges that would be tiny on a slider plate) | **stack** — full-width cards, one under the other | the croppable element gets the whole width |

When in doubt → **slider**. The stack is the exception, only when a screen
genuinely needs the full page width.

## Structure

Each `figure.case__figure` holds:

```html
<figure class="case__figure">
  <!-- DESKTOP (>640px): the flat side-by-side composition(s) -->
  <picture class="case__figure-desktop"><img src="…composite.webp"></picture>

  <!-- MOBILE (≤640px): a horizontal swipe slider of the individual screens -->
  <div class="case__slider">
    <div class="case__slide"><img class="case__shot case__shot--phone"   src="…s1.webp"></div>
    <div class="case__slide"><img class="case__shot case__shot--desktop" src="…s2.webp"></div>
  </div>

  <figcaption>…</figcaption>
</figure>
```

- `>640px` → `.case__figure-desktop` shows, `.case__slider` / `.case__stack` hide.
- `≤640px` → `.case__figure-desktop` hides, the slider / stack shows.

Several composites can share one figure (e.g. two `.case__figure-desktop`
pictures) when their mobile screens are merged into a single slider — see
"Merging" below.

The slider images are **separate files from the desktop composite** — slice
each screen out of the composition into its own `…-s1/-s2/…webp`. The desktop
composite is never touched by mobile changes.

## The plate (slider frame)

Every `.case__slide` in a slider is one uniform **plate**:

- **Height `56vh`** — a tall portrait plate, the SAME for every block.
  - NOT `aspect-ratio`: WebKit (iOS Safari + Chrome-on-iOS) won't treat an
    aspect-ratio height as definite, so `%`/`object-fit` sizing on the child
    silently breaks and the screen overflows / crops. Always give a real height.
- Width `94%` of the slider → the neighbouring screen peeks (~20px), so it
  reads as swipeable.
- **12px inset** all round. A vertical phone fills the height and ends up with
  12px top & bottom (grey on the sides); a wide desktop fills the width and
  ends up with 12px left & right (grey top & bottom). That grey is expected.
- Background `rgb(227,229,230)` (matches the screens' own backdrop, seamless).
- **No rounded corners** (see convention below).
- `object-fit: contain` on `.case__shot` — the screen is shown whole, never cropped.

## Screen types (the `--modifier` on `.case__shot`)

| Modifier   | Use for | Behaviour on the 56vh plate |
|------------|---------|------------------------------|
| `--phone`  | a vertical phone mockup | fills the height (12px top/bottom), grey on the sides — expected |
| `--desktop`| a horizontal desktop / web screen | fills the width (12px sides), grey top/bottom — expected |
| `--fill`   | a full-bleed background plate (e.g. the gradient category panel) | `object-fit: cover`, absolutely positioned `inset:0` — the image **is** the whole plate background, bleeds all edges |
| `--phone` + slide `--feed` | a vertical scroll feed | top/bottom padding removed so the feed cards bleed off the top & bottom like a continuous scroll; side margin stays. Add `case__slide--feed` to the slide `<div>` |

## Stack mode (the full-width exception)

When a block has 2 screens and one must be full-width (a tall narrow element
that would be tiny on a slider plate, e.g. the badge column), use a stack
instead of a slider:

```html
<div class="case__stack">
  <div class="case__slide"><img class="case__shot case__shot--phone" src="…s1.webp"></div>
  <div class="case__slide"><img class="case__shot case__shot--phone" src="…s2.webp"></div>
</div>
```

- Cards are **full content width**, one under the other.
- Height follows the content, capped at `70vh` so a tall/narrow screen can't
  blow up. 12px inset, no rounded corners.

## Merging (one section → one slider)

If a single section has several figures of the same topic, merge their mobile
screens into ONE slider (keep each desktop composite for >640px). **Lead with
the most important screen** — e.g. the full product card, not a supporting UI
element. Example: iTAB section 1 merges the available-state figure and the
unavailable-state (Notify) flow into a single 6-screen slider that starts on
the product card.

### Rules of thumb

1. **Every plate is the same big size** (56vh). A phone fills the height; a
   desktop fills the width; both sit on the identical plate.
2. **Show screens big, never as runts.** A flow of phones is a swiped slider,
   never a single squeezed composite on mobile.
3. **`contain`, never crop** the actual screens — the two full-bleed exceptions
   are `--fill` (cover) and `--feed` (bleeds top/bottom) on purpose.
4. **Slider by default; stack only when a screen needs full width.**
5. **No rounded corners on any plate / card / frame.** Every backing surface
   uses `border-radius: 0`. Pills/buttons keep their own radius — this rule is
   about plates.

## Hero / cover

The hero image (`case-*-hero.webp`) is the **complete scene** (device + gradient
+ clouds baked in). It fills the whole `.case__hero-image` frame — do **not**
add a separate CSS gradient or separate cloud layers on top, or you get
"gradient on gradient" + doubled clouds.

## Header (mobile topbar)

`.mobile-topbar` = the name on the left (links to `index.html` = home) and
`Menu` on the right. The name uses `white-space: nowrap` so it can't wrap and
shove `Menu` out of place.
