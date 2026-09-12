Changelog
===

# 1.0.0

> 2026-09-12

First stable release. The anchor point is finished, the geometry is settled, and
the package has a license — there's nothing left that was waiting to change
shape before calling it 1.0.

**BREAKING CHANGE**: Requires Layer Cake v11. `layercake` is now a peer
dependency at `^11.0.0`, so install it yourself. On npm an app pinned to
layercake 10 gets an ERESOLVE error — upgrade Layer Cake first.

**BREAKING CHANGE**: Minimum Svelte is now 5.40.

**BREAKING CHANGE**: `source.dy` on an arrow is measured from the annotation's
anchor point rather than from the top of its box. `source.dx` is unchanged,
still measured from the near edge.

The box's height was never knowable without measuring the page, so the renderer
was passing zero for it and drawing arrows as though the box's top edge sat on
the data point. That is only true at `anchorY: 0`; anywhere else the arrow left
from somewhere the annotation wasn't, in published charts as well as the editor.
Arrows now hang off the anchor point, which is knowable from the config alone.

To put an arrow at the middle or bottom of a box, set `anchorY` and leave
`source.dy` at 0. The browser resolves `anchorY` against the real box, so that
keeps working when the text re-wraps.

**BREAKING CHANGE**: The `containerClass` prop is gone. Layer Cake 11 hands the
library its own container, so there is nothing to configure.

Also in this release:

- Annotations with no `width` now render at the width the geometry assumes,
  instead of shrinking to fit their text while the maths used 155px.
- Positions on charts using `percentRange` are converted before being inverted.
  They were being fed pixels against a 0-100 range, which made annotations
  uneditable on those charts.
- Resizing no longer walks the annotation upwards when the anchor isn't at the
  top.
- Dropped the `underscore` dependency, which shipped whole to anyone importing
  only the static renderer.
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
