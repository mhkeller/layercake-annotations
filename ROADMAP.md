# Roadmap

One planned pass over the library: fix the arrow geometry properly, drop the
dead weight, and move to Layer Cake v11. Written down so the reasoning survives
the gap between planning it and doing it.

Status as of 2026-09-12: branch `feat/registration-drag`, five commits, not
pushed. Nothing below is started.

## Why this exists

The library has one user, its author. That means no config migration, no
deprecation window, and no reason to split this into safely shippable slices.
It is cheaper to make one coherent change than five careful ones.

## What is already committed

| Commit | What |
|---|---|
| `8048604` | ignore `.claude` |
| `96fe4f7` | draggable anchor point, hover fixed to `mouseenter`/`mouseleave`, anchor math measures the border box |
| `03d93e6` | MIT license, package metadata |
| `0a47b0b` | `sideEffects: false`, `default` export condition |
| `0fc199d` | underscore replaced with two local debounce helpers |

## The decision: anchor as origin

### The thing to understand first

Released 0.4.0 computed an annotation's box with no anchor term at all:

```js
const top = yScale(y(anno.data)) + offsetY;   // this IS the anchor point
```

and stored arrow offsets as `calculateSourceDy = pixelY - box.top`. So **every
arrow offset the library has ever saved is already measured from the anchor
point.** The data model was self-consistent.

The anchor work in `96fe4f7` redefined `box.top` to mean "top-left corner"
without changing what stored `source.dy` means. That is the whole bug. Arrows
detach from annotations whenever `anchorY` is non-zero, in published charts as
well as the editor, because `Arrows.svelte` passes no height and the anchor
correction silently multiplies by zero.

So this is not a missing feature. It is repairing a regression on top of a data
model that was already right.

### The rule

> There is exactly one point on an annotation whose chart position is knowable
> from config alone: the anchor point. Width is in config, so horizontal
> landmarks are free. Height comes from text wrapping, so every vertical
> landmark except the anchor costs a DOM measurement.

Therefore: keep `source.dx` relative to the near edge, and measure `source.dy`
down from the anchor point. No measurement is needed in either render path.

### The invariant to keep

> The box's measured height may be read in the editor, at the moment a gesture
> turns into stored numbers. It may never be read by code that draws a saved
> arrow.

This is grep-checkable, and it is the thing that stops this class of bug coming
back. Copy it into `ARCHITECTURE.md`.

### Shape

`src/lib/modules/coordinates.js` goes from 152 lines to roughly 60.
`getAnnotationBox` is deleted outright, and with it the optional `annoHeight`
parameter that made the wrong call silently compile.

```js
export function getAnchorPoint(anno, k) { /* the one known point */ }
export function getBoxEdges(anno, k)   { /* left, right, width - deliberately no top/bottom */ }

export function getArrowSource(anno, arrow, k) {
  const { left, right } = getBoxEdges(anno, k);
  const dx = arrow.source?.dx ?? (arrow.side === 'west' ? -HANDLE_OFFSET_PX : HANDLE_OFFSET_PX);
  return {
    x: (arrow.side === 'east' ? right : left) + dx,
    y: getAnchorPoint(anno, k).y + (arrow.source?.dy ?? 0)
  };
}

export function calculateSourceDy(pixelY, anno, k) {
  return pixelY - getAnchorPoint(anno, k).y;
}
```

The editor owes exactly one compensation. Dragging the anchor holds the box
still, so the anchor point slides down the chart by `deltaY` — a number
`setAnchor` already computes. Subtract it from each `source.dy` and the arrows
hold still. `source.dx` needs nothing, because the existing compensation already
holds the left edge invariant and `dx` is edge-relative.

That asymmetry — X free, Y one line — is the rule showing through.

### What it gives up

A published arrow stops tracking the box when the box's height changes in the
*reader's* browser: a late webfont, a larger default font size, a translated
string. Exposure is proportional to `anchorY`, and zero at `anchorY: 0`.

Two cheap things claw most of it back, and neither puts measurement in the
render path:

- `source: { dy: '50%' }` — how an author says "stay centred whatever the text
  does". Borrow `parseCssValue` from the docs site
  (`layercake/src/_modules/arrowUtils.js`) so `dy` accepts `12`, `'12px'` and
  `'50%'`. The README already claims `dy` behaves this way.
- A `bind:borderBoxSize` inside `AnnotationEditor` that rewrites `source.dy`
  when the height changes, preserving the box-relative offset while authoring.
  ~10 lines, editor only.

### Why not the alternatives

Five architectures were designed independently and attacked; three judges ranked
this one first unanimously (82, 84, 84).

| Rejected | Why |
|---|---|
| Pin Space | Same insight but re-bases `dx` too, which buys nothing |
| Measured Box Registry | The only design correct through re-wrap forever, but needs permanent measurement machinery, and hoisting `<Arrows>` out of `Editor` kills the contexts that drive arrow drag preview |
| Anchor-local arrows | Best structural argument, but a 0×0 wrapper becomes the box's containing block and `percentRange` vanishes; ~1,580 of 2,413 lines |
| Port the docs-site renderer wholesale | Measures at draw time, so it emits `d=""` on the server; `getElPosition` measures against the wrong parent here |
| Pure CSS anchoring | `d: shape()` ships in no engine, `d: path()` is unsupported in WebKit, and `anchor()` disagrees across engines once the anchor element has a transform |
| Store height in config as authoritative | A stale height is worse than a measured one and uglier than none |

A useful null result: Layer Cake renders nothing server-side without
`ssr={true}`, and with it `containerWidth` defaults to 100 — so a responsive
prerendered chart lays out every layer for a 100×100 box and snaps on hydration.
SSR-exactness is worth less here than it first appears. The real bar is
first-client-frame correctness with no `tick()`, which this clears.

## The work

Grouped by what has to be true before the next group makes sense. Not meant as
separate releases.

### 1. Standalone bugs, no design content

- **`containerClass` is never forwarded.** `Annotations.svelte` has no such prop,
  while `Draggable.svelte:60` calls `boxEl.closest(containerClass).getBoundingClientRect()`
  with no null check. Any consumer whose wrapper is not `.chart-container` gets a
  TypeError on their first drag. Live in the shipped package.
- **`ResizeHandles.svelte:86` and `:107`** add a height read *now* to an
  `initialRect.top` captured at mousedown. With a non-zero anchor, resizing an
  annotation narrow enough to re-wrap makes it creep vertically. These lines are
  deleted by the rewrite anyway.
- **`/ordinal` is broken on `main`** — still uses the pre-0.4.0 flat annotation
  schema, so the route renders blank. Nothing catches it; Playwright only visits `/`.
- **`style:transform` clobbers** any transform a consumer sets via `d.style`.
  Use the standalone `translate` CSS property instead.

### 2. Tests that can actually catch this class of bug

The current suite cannot. Its 14 PNGs are only 9 distinct images —
`3-resized-*` is byte-identical to `1-text-arrow-*` in both variants, so the
resize drag is not taking effect, and `4-custom-style-static.png` matches
`1-text-arrow-linear-static.png`, so the custom-style case shows neither the new
annotation nor the yellow background. There are zero anchor scenarios.

Add numeric assertions before touching geometry:

- The drawn path's `M` command equals the source handle's centre, at a non-zero
  `anchorY`, in **both** edit and static mode. This is the assertion that would
  have caught the regression.
- Dragging the anchor with an arrow attached leaves the arrow where it was.
- Then require the existing snapshots to pass byte-identical. Any diff is a bug,
  not a re-baseline.

### 3. The geometry rewrite

Files: `coordinates.js` (rewrite), `Arrows.svelte` (drop the trailing argument —
this is the visible fix), `ArrowZone.svelte` (drop `boxHeight`, the `annoBox`
derived, the trailing arguments), `AnnotationEditor.svelte` (one compensation in
`setAnchor`, delete the `boxHeight` derived), `ResizeHandles.svelte` (delete the
two anchor lines), `types.d.ts`, `README.md`.

Two traps in the rewrite itself:

- `setAnchor` is called from two places — `AnnotationEditor.svelte:169` with a
  `from` baseline, and `:194` (Option+click) without — and the `start` object
  has no `sourceDy` key. Write `start.sourceDy?.[a.side] ?? a.source?.dy ?? 0`
  and guard `a.source` being absent.
- Do **not** rewrite `Draggable` to accumulate `movementX` to save a prop. That
  trades a self-correcting absolute measurement for an accumulator. Wait for
  `k.pointer` in step 5.

### 4. The things nobody solved

Now in scope, because there is no compatibility to protect.

- **The `percentRange` write path.** `invertScale($xScale, pixelX)` is fed pixels
  while the range is `[0, 100]` — `AnnotationEditor.ondrag`, `newAnnotation.js:13`,
  `ArrowZone` at four sites, `Draggable:67`. Without this, arrows draw correctly
  but targets stay un-editable under `percentRange`.
- **Width-less configs.** `.draggable` and `.static-wrapper` are `inline-block`
  with no width, so a config omitting `width` is shrink-to-fit while the maths
  assumes 155px. Every `anchorX` and east-arrow source for such a config is
  already wrong, in both modes, independent of `anchorY`. Either require `width`
  or make the fallback real.
- **`side` doubles as the primary key.** `modifyArrow(id, side, props)` caps an
  annotation at one west and one east arrow forever. Free `side` from being the
  key if more than two arrows should ever be possible.
- **The dead cmd+click hit area.** `.note-listener` covers the whole SVG layer,
  so `Arrows.svelte`'s `.arrow-hitarea` is unreachable; the cycling that actually
  fires is the duplicate in `ArrowZone:143`. Reviving the hit area carves a 12px
  corridor along every arrow where click-to-create stops working. Decide which
  behaviour is wanted rather than letting it resolve itself.
- **A styling contract for `.layercake-annotation`.** Margin, a consumer
  transform, or different padding silently move the box away from where arrows
  expect it.

### 5. The v11 port

Do this last: `getAnchorPoint(anno, k)` is already the v11 shape, so the port
deletes both copies of `getScales()` rather than translating them.

- Seven library files and seven demo components destructure
  `getContext('LayerCake')`. v11 mints its context key with `createContext()`, so
  that call returns `undefined` and every one throws. ~41 store reads.
- **Never destructure the context at component top level.** `k` is a plain
  reactive object; a top-level destructure takes a dead snapshot, silently. It
  shows up as a chart that renders once then freezes on resize. Read `k.xScale`
  at the point of use, or inside `$derived`.
- `layercake` moves from `dependencies` to `peerDependencies` at `^11`. Two
  copies in one tree is now a hard `missing_context` throw, not a quiet accident.
- Svelte floor becomes `>=5.40`. `^5.0.0` is already wrong — `$props.id()`
  needs 5.20.
- No toolchain bump required. SvelteKit 2 / Vite 5 builds v11 cleanly.
- Adopt `k.pointer(event)` while here. Absolute, immune to page zoom, and it
  removes `containerClass` from `ResizeHandles` as well as `Draggable`.
- Use `bind:borderBoxSize` rather than `clientWidth`/`offsetWidth`. It routes
  through Svelte's shared `ResizeObserverSingleton`, and the border box is what a
  CSS transform percentage actually resolves against. This kills the
  `noteDimensions` / `getBoundingClientRect` duality for good.

Measurement cannot loop here: writing `left`/`top` on an absolutely positioned,
content-sized box cannot change its size. Measured — 20 box moves produced 0
observer callbacks.

## Decisions still open

1. **Vertical resize.** There is a horizontal resize handle and a `width` field,
   and no vertical equivalent. A vertical resize handle plus a stored height
   would make every geometry question closed-form and moot most of this document.
   Nobody proposed it; it deserves a yes or no rather than silence.
2. **The dead hit area** (see 4). Revive it and accept a dead corridor, or delete
   it and keep `ArrowZone`'s duplicate.
3. **Version number.** Everything here is breaking. `1.0.0` is defensible now the
   anchor feature is finished; `0.5.0` matches the existing habit of shipping
   breaking changes as minors.

## Verification

- `pnpm test` — 14/14. Snapshots must pass byte-identical; treat any diff as a
  bug until proven otherwise.
- `git status tests/` — clean.
- `pnpm exec svelte-check` — the baseline is 9 pre-existing errors, not 0. The
  gate is "same 9".
- `pnpm lint` — red at HEAD on 12 files (prettier 3.7.4 installed against a
  `^3.1.1` spec). Either pin prettier or reformat once, deliberately.
- `pnpm package` — publint clean.
- Open both `/` and `/ordinal` in the dev server. `/ordinal` is not covered by
  any test.
