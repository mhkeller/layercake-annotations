# Changelog

# 1.0.0

> 2026-09-19

First stable release. It moves the library to Layer Cake 11, measures arrows from the annotation's anchor point, and adds an MIT license.

**BREAKING CHANGE**: Requires Layer Cake v11. `layercake` is now a peer dependency at `^11.0.0`, so install it yourself. On npm an app pinned to layercake 10 gets an ERESOLVE error — upgrade Layer Cake first.

**BREAKING CHANGE**: Minimum Svelte is now 5.40.

**BREAKING CHANGE**: `source.dy` on an arrow is measured from the annotation's anchor point rather than from the top of its box. `source.dx` is unchanged, still measured from the near edge.

This fixes arrows drawn from the wrong place whenever `anchorY` is not 0.

To put an arrow at the middle or bottom of a box, set `anchorY` and leave `source.dy` at 0. The browser resolves `anchorY` against the real box, so that keeps working when the text re-wraps.

**BREAKING CHANGE**: The `containerClass` prop is gone. Layer Cake 11 hands the library its own container, so there is nothing to configure.

**New**: the anchor point is editable. Hover an annotation in edit mode to show it as a small diamond, drag the diamond to put the anchor anywhere in the box, Option+click the annotation to step through nine presets, or nudge it with the arrow keys once it has focus. The annotation stays where it is while the anchor moves — `dx` and `dy` absorb the difference. `anchorX` and `anchorY` are new optional properties on an annotation.

Also in this release:

- Annotations with no `width` now render at the width the geometry assumes.
- Charts using `percentRange` work in both directions. Positions are converted before being inverted, so annotations are editable, and the scales are converted to pixels before they are drawn, so arrows land on the annotation instead of in the top-left corner.
- Pressing Enter on a focused chart creates an annotation in the middle of it, rather than one at an invalid position.
- Dragging an annotation onto the exact left or top edge of the chart area now sticks, instead of being discarded as if it had not moved.
- Resizing no longer walks the annotation upwards when the anchor isn't at the top.
- The handle that starts a new arrow sits at the middle of the annotation's edge, so it holds still while the anchor moves. Arrows drawn this way store a `source.dy` of half the box's height.
- The anchor diamond shows an open hand, and a closed one while it is being dragged.
- The anchor diamond disappears with the rest of the hover controls once the pointer leaves. Pressing it gives it keyboard focus so the arrow keys work, and that focus used to keep it on screen by itself.
- Pressing Enter on a focused annotation opens it for editing. It used to throw.
- Dragging runs on pointer events with pointer capture. The library no longer listens for mouse moves across the whole page while a drag is in progress, and a drag that ends off the chart or outside the window is no longer lost.
- Dropped the `underscore` dependency, which shipped whole to anyone importing only the static renderer.
- Added `sideEffects: false` and a `default` export condition.
- Added an MIT license.

# 0.4.0

> 2026-01-01

**BREAKING CHANGE**: User data fields are now nested under a `data` property.

Before:

```js
{ id: 0, myX: 1995, myY: 5, dx: 0, ... }
```

After:

```js
{ id: 0, data: { myX: 1995, myY: 5 }, dx: 0, ... }
```

Arrow targets similarly updated. This prevents collisions when user data has fields named `id`, `dx`, `text`, etc.

- [PR#26](https://github.com/mhkeller/layercake-annotations/pull/26)

# 0.3.2

> 2025-12-30

- Fix arrowheads not appearing when multiple charts are on the same page
  - [PR#25](https://github.com/mhkeller/layercake-annotations/pull/25)

# 0.3.1

> 2025-12-29

- Fix arrow zone hover not working (regression from 0.3.0)
  - [PR#24](https://github.com/mhkeller/layercake-annotations/pull/24)

# 0.3.0

> 2025-12-29

- Fix edit mode visibility bug where annotations were invisible
- Add support for custom `style` attribute on annotations
- Remove hardcoded text color - library is now unopinionated about styling
- Restructure and simplify Playwright tests
  - [PR#22](https://github.com/mhkeller/layercake-annotations/pull/22)
  - [PR#23](https://github.com/mhkeller/layercake-annotations/pull/23)

# 0.2.1

> 2025-12-28

- Fix outline appearing on note-listener when deleting annotation
- Fix improved annotation state after deleting annotation.
  - [PR#21](https://github.com/mhkeller/layercake-annotations/pull/21)

# 0.2.0

> 2025-12-22

- Disable pointer events on `Static.svelte`
  - [PR#20](https://github.com/mhkeller/layercake-annotations/pull/20)

# 0.1.1

> 2025-12-22

- Save annotation on text edit.
  - [PR#19](https://github.com/mhkeller/layercake-annotations/pull/19)

# 0.1.0

> 2025-12-21

- Initial version
