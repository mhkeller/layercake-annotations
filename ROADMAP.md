# Roadmap

One planned pass over the library: fix the arrow geometry properly, drop the dead weight, and move to Layer Cake v11. Written down so the reasoning survives the gap between planning it and doing it.

Status as of 2026-09-12: **done**, on branch `feat/registration-drag`, not pushed. Kept as the record of why the library is shaped the way it is; the reasoning matters more than the checklist.

Shipped as `1.0.0`. Everything below was done except the styling contract for `.layercake-annotation`, which is recorded under Deliberately not done.

## Why this exists

The library has one user, its author. That means no config migration, no deprecation window, and no reason to split this into safely shippable slices. It is cheaper to make one coherent change than five careful ones.

## Groundwork, committed before the rewrite

| Commit    | What                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------- |
| `8048604` | ignore `.claude`                                                                                      |
| `96fe4f7` | draggable anchor point, hover fixed to `mouseenter`/`mouseleave`, anchor math measures the border box |
| `03d93e6` | MIT license, package metadata                                                                         |
| `0a47b0b` | `sideEffects: false`, `default` export condition                                                      |
| `0fc199d` | underscore replaced with two local debounce helpers                                                   |

## The decision: anchor as origin

### The thing to understand first

Released 0.4.0 computed an annotation's box with no anchor term at all:

```js
const top = yScale(y(anno.data)) + offsetY; // this IS the anchor point
```

and stored arrow offsets as `calculateSourceDy = pixelY - box.top`. So **every arrow offset the library has ever saved is already measured from the anchor point.** The data model was self-consistent.

The anchor work in `96fe4f7` redefined `box.top` to mean "top-left corner" without changing what stored `source.dy` means. That is the whole bug. Arrows detach from annotations whenever `anchorY` is non-zero, in published charts as well as the editor, because `Arrows.svelte` passes no height and the anchor correction silently multiplies by zero.

So this is not a missing feature. It is repairing a regression on top of a data model that was already right.

### The rule

> There is exactly one point on an annotation whose chart position is knowable from config alone: the anchor point. Width is in config, so horizontal landmarks are free. Height comes from text wrapping, so every vertical landmark except the anchor costs a DOM measurement.

Therefore: keep `source.dx` relative to the near edge, and measure `source.dy` down from the anchor point. No measurement is needed in either render path.

### The invariant to keep

> The box's measured height may be read in the editor, at the moment a gesture turns into stored numbers. It may never be read by code that draws a saved arrow.

This is grep-checkable, and it is the thing that stops this class of bug coming back. Copy it into `ARCHITECTURE.md`.

### Shape

`src/lib/modules/coordinates.js` went from 152 lines to 142. `getAnnotationBox` was deleted outright, and with it the optional `annoHeight` parameter that made the wrong call silently compile.

```js
export function getAnchorPoint(anno, k) {
	/* the one known point */
}
export function getBoxEdges(anno, k) {
	/* left, right, width - deliberately no top/bottom */
}

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

The editor owes exactly one compensation. Dragging the anchor holds the box still, so the anchor point slides down the chart by `deltaY` — a number `setAnchor` already computes. Subtract it from each `source.dy` and the arrows hold still. `source.dx` needs nothing, because the existing compensation already holds the left edge invariant and `dx` is edge-relative.

The asymmetry is what the rule predicts: horizontal positions are free, vertical ones need the one compensation.

### What it gives up

Almost nothing. `anchorY` is already a percent-of-box control, and the browser resolves it: the anchor point's position is pure config, and the box is placed around it by `translate: -anchorX% -anchorY%`. CSS does the percent-of-an-unknown-height arithmetic, so JS never needs the number.

So an arrow leaving the vertical middle is `anchorY: 50` with `source.dy: 0`; the bottom edge is `anchorY: 100`. Those track re-wrap forever, in published charts, with no measurement — when the text re-wraps the browser re-resolves the transform.

The real limitation is narrower: there is exactly **one** such point per annotation, and it is shared between the data-point pinning and the arrows. A box pinned by its top-left whose arrow leaves from its middle-right cannot be expressed without measuring. That is the one case this design cannot express.

Do **not** add `source: { dy: '50%' }` as a way around this. It is incoherent here: 50% of the box height requires knowing the box height, which is the one thing the invariant forbids in the render path. It works in the docs site only because that code measures the element first. Either it breaks the invariant or it resolves at authoring time and does not track re-wrap — it cannot do what it advertises.

### Why not the alternatives

| Rejected                                                       | Why                                                                                                                                                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pin Space                                                      | Same insight but re-bases `dx` too, which buys nothing                                                                                                                                                              |
| Measured Box Registry                                          | The only design correct through re-wrap forever, but needs permanent measurement machinery, and hoisting `<Arrows>` out of `Editor` kills the contexts that drive arrow drag preview                                |
| Anchor-local arrows                                            | Best structural argument, but a 0×0 wrapper becomes the box's containing block and `percentRange` vanishes; ~1,580 of 2,413 lines                                                                                   |
| Port the docs-site renderer wholesale                          | Measures at draw time, so it emits `d=""` on the server; `getElPosition` measures against the wrong parent here                                                                                                     |
| Pure CSS anchoring                                             | `d: shape()` ships in no engine, `d: path()` is unsupported in WebKit, and `anchor()` disagrees across engines once the anchor element has a transform                                                              |
| Store a measured height in config                              | A cached layout result. Depends on width, text, font, font-size, line-height and engine, so it goes stale with nothing to signal it                                                                                 |
| Author a height as a constraint, with a vertical resize handle | Not stale — it is an input, like `width`. Rejected because the editor edits text inline, so a declared height clips the text as it is typed. Overflowing horizontally merely wraps; overflowing vertically does not |

Server-side rendering was checked and left alone. Layer Cake renders nothing server-side without `ssr={true}`, and with it `containerWidth` defaults to 100 — so a responsive prerendered chart lays out every layer for a 100×100 box and snaps on hydration. Exact SSR output is worth little here. The bar that matters is being correct on the first client frame with no `tick()`, which this design meets.

## The work

Grouped by what had to be true before the next group made sense. Not separate releases.

### 1. Standalone bugs, no design content

- **`containerClass` was never forwarded.** `Annotations.svelte` had no such prop, while `Draggable.svelte:60` called `boxEl.closest(containerClass).getBoundingClientRect()` with no null check. Any consumer whose wrapper was not `.chart-container` got a TypeError on their first drag. It was live in the shipped package.
- **`ResizeHandles.svelte:86` and `:107`** added a height read _now_ to an `initialRect.top` captured at mousedown. With a non-zero anchor, resizing an annotation narrow enough to re-wrap made it creep vertically. The rewrite deleted these lines anyway.
- **`/ordinal` was broken on `main`** — it still used the pre-0.4.0 flat annotation schema, so the route rendered blank. Nothing caught it; Playwright only visited `/`.
- **`style:transform` clobbered** any transform a consumer set via `d.style`. The standalone `translate` CSS property is used instead.

### 2. Tests that catch this class of bug

The old suite could not. Its 14 PNGs were only 9 distinct images — `3-resized-*` was byte-identical to `1-text-arrow-*` in both variants, so the resize drag was not taking effect, and `4-custom-style-static.png` matched `1-text-arrow-linear-static.png`, so the custom-style case showed neither the new annotation nor the yellow background. There were zero anchor scenarios.

Numeric assertions came in before the geometry was touched:

- The drawn path's `M` command equals the source handle's centre, at a non-zero `anchorY`, in **both** edit and static mode. This is the assertion that would have caught the regression.
- Dragging the anchor with an arrow attached leaves the arrow where it was.
- The existing snapshots then have to pass byte-identical. Any diff is a bug, not a re-baseline.

### 3. The geometry rewrite

Files changed: `coordinates.js` (rewrite), `Arrows.svelte` (drop the trailing argument — this is the visible fix), `ArrowZone.svelte` (drop `boxHeight`, the `annoBox` derived, the trailing arguments), `AnnotationEditor.svelte` (one compensation in `setAnchor`, delete the `boxHeight` derived), `ResizeHandles.svelte` (delete the two anchor lines), `types.d.ts`, `README.md`.

Two traps in the rewrite itself:

- `setAnchor` is called from two places — `AnnotationEditor.svelte:169` with a `from` baseline, and `:194` (Option+click) without — and the `start` object has no `sourceDy` key. The code reads `start.sourceDy?.[a.side] ?? a.source?.dy ?? 0` and guards `a.source` being absent.
- `Draggable` was **not** rewritten to accumulate `movementX` to save a prop. That would have traded a measurement for an accumulator. `k.pointer` in step 5 replaced both: it reads the pointer absolutely, against a grab offset measured once when the drag starts.

### 4. The things nobody solved

In scope, because there was no compatibility to protect.

- **The `percentRange` write path.** `invertScale($xScale, pixelX)` was fed pixels while the range was `[0, 100]` — `AnnotationEditor.ondrag`, `newAnnotation.js:13`, `ArrowZone` at four sites, `Draggable:67`. Without the fix, arrows drew correctly but targets stayed un-editable under `percentRange`.
- **The `percentRange` read path**, found later by a cleanup pass. `getAnchorPoint` and `getArrowTarget` added a scale output of 0-100 to a pixel offset, so arrows on a percent-range chart drew into the top-left corner. The box itself was fine, because it was positioned by a second, CSS implementation of the same expression that did handle percent ranges. That duplication was the actual defect: `coordinates.js` now converts with `toPixels`, and both renderers set `left`/`top` from `getAnchorPoint` instead of building their own `calc()` string.
- **Width-less configs.** `.draggable` and `.static-wrapper` were `inline-block` with no width, so a config omitting `width` was shrink-to-fit while the maths assumed 155px. Every `anchorX` and east-arrow source for such a config was wrong, in both modes, independent of `anchorY`. The fallback width was made real.
- **`side` doubles as the primary key.** `modifyArrow(id, side, props)` caps an annotation at one west and one east arrow forever. Freeing `side` from being the key is what more than two arrows would need.
- **The dead cmd+click hit area.** `.note-listener` covered the whole SVG layer, so `Arrows.svelte`'s `.arrow-hitarea` was unreachable; the cycling that fired was the duplicate in `ArrowZone:143`. Reviving the hit area would carve a 12px corridor along every arrow where click-to-create stops working. The choice was made rather than left to resolve itself — see below.
- **A styling contract for `.layercake-annotation`.** Margin, a consumer transform, or different padding silently move the box away from where arrows expect it. Not written — see below.

### 5. The v11 port

This came last: `getAnchorPoint(anno, k)` was already the v11 shape, so the port deleted both copies of `getScales()` rather than translating them.

- Seven library files and seven demo components destructured `getContext('LayerCake')`. v11 mints its context key with `createContext()`, so that call returns `undefined` and every one throws. ~41 store reads.
- **Never destructure the context at component top level.** `k` is a plain reactive object; a top-level destructure takes a dead snapshot, silently. It shows up as a chart that renders once then freezes on resize. Read `k.xScale` at the point of use, or inside `$derived`.
- `layercake` moved from `dependencies` to `peerDependencies` at `^11`. Two copies in one tree is now a hard `missing_context` throw, not a quiet accident.
- The Svelte floor became `>=5.40`. `^5.0.0` was wrong — `$props.id()` needs 5.20.
- No toolchain bump was required. SvelteKit 2 / Vite 5 builds v11 cleanly.
- `k.pointer(event)` was adopted in all three drag paths — `Draggable`, `ResizeHandles` and `ArrowZone`. It is absolute, immune to page zoom, and it removed `containerClass` along with the hand-rolled container-rect arithmetic each one had.
- `bind:borderBoxSize` was considered and not adopted. The `clientWidth`/`clientHeight` bindings that fed `noteDimensions` were deleted outright instead, because nothing read the result: the anchor math measures with `getBoundingClientRect` at the moment of the gesture, which is the border box it needs.

Measurement cannot loop here: writing `left`/`top` on an absolutely positioned, content-sized box cannot change its size. Measured: 20 box moves produced 0 observer callbacks.

## Deliberately not done

**Freeing `side` from being the arrow key.** `modifyArrow(id, side, props)` caps an annotation at one west and one east arrow. Changing the key would enable more, but the editor only ever offers two zones, so it would be a data-model change in support of a feature that doesn't exist. Worth doing the day a third arrow is wanted, not before.

**A styling contract for `.layercake-annotation`.** Margin, a consumer transform, or different padding on the annotation still move the box away from where the arrows expect it, and nothing documents or enforces that. One piece of it was handled: the box is positioned with the standalone `translate` property rather than `transform`, so a consumer's own transform survives. The rest is open, and needs a real consumer with a real stylesheet before it is worth specifying.

**The dead hit area: deleted rather than revived.** `.note-listener` covers the whole Html layer, so `Arrows.svelte`'s `.arrow-hitarea` never received a click and the cmd+click that fires is `ArrowZone`'s. Reviving it would have carved a 12px corridor along every arrow where click-to-create stops working.

## Settled

**Vertical resize / stored height: no** (2026-09-12). Storing a _measured_ height caches a layout result and goes stale. Authoring a height as a _constraint_ is not stale — it is an input like `width` — but the editor edits text inline, and a declared height clips text as it is typed. Height stays content-driven, and `anchorY` serves as the percent-of-box control since CSS resolves it without any measurement.

## Verification

- `pnpm test` — 27/27: 9 node unit tests and 18 Playwright tests. Snapshots must pass byte-identical; treat any diff as a bug until proven otherwise.
- `git status tests/` — clean.
- `pnpm exec svelte-check` — the baseline is 8 pre-existing errors, not 0. The gate is "same 8".
- `pnpm lint` — red at HEAD on 12 files (prettier 3.7.4 installed against a `^3.1.1` spec). Either pin prettier or reformat once, deliberately.
- `pnpm package` — publint clean.
- Open both `/` and `/ordinal` in the dev server. `/ordinal` is not covered by any test.
