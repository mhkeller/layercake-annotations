# Changelog

# 1.1.0

> 2026-09-19

**New**: an `onsave` prop on `<Annotations>` and `<AnnotationsEditor>`. It is called a second after the last edit with the config as JavaScript text, ready to paste into a chart or write to a `.js` file. A second argument holds a plain copy of the annotations as data. Without `onsave` the text is logged to the console for copy-paste.

**Changed**: a `saveAnnotationConfig` function set in context is now documented, for an app that mounts a chart it didn't write. It is called the same way as `onsave`: the text first, then the annotations. It used to be handed the annotations alone. A function written for 1.0.0 needs a change: the annotations are now its second argument. `onsave` wins when both are there.

**New**: Ctrl works wherever Cmd does, for Windows and Linux. Ctrl+click an annotation to cycle its alignment, and Ctrl+click an arrow's handle to cycle its curve. Alt+click is the same key as Option+click and steps the anchor through its presets.

**New**: more of the config can be left out. `dx`, `dy` and `arrows` on an annotation, and `clockwise`, `source` and each offset in `source` on an arrow, are optional in the types, and a note written without them can be edited. It used to store `NaN` or throw. Editing may write the defaults out in full, which draws the same.

Fixes:

- Starting to edit a second note straight after the first, then pressing Backspace while typing, deleted the second note. The key now stays in the text.
- Backspace or Delete typed into an input, textarea, select or editable element anywhere on the page no longer deletes the hovered note.
- After Backspace removed a hovered arrow, a second press, or holding the key down, deleted the whole note. Deleting a note that sat on top of another did the same to the one underneath. A note or handle is hovered once the mouse has moved over it or focus has reached it, so what turns up under a mouse that is holding still is left alone, and a held key deletes nothing more.
- Ending a text edit with a slow click on empty chart space no longer adds a new note as well.
- Hovering stopped working until a reload after a drag whose release never arrived: a note deleted mid-press, a cancelled pointer, an error while saving an arrow. Every drag ends, whatever ends it.
- On a band scale, a note or arrow target dragged ahead of the first band stored `null` as its data value, which froze the note and broke its arrows. It now takes the nearest band. A band scale whose range is reversed gives the right band too. The stored offset within a band is a share of the chart's size, which is what drawing reads it as, so a band scale with a custom range keeps its notes where they were dropped.
- A plain click on the handle that starts an arrow no longer saves an arrow of no length.
- Only the primary mouse button drags. A right-click leaves the note where it is.
- A press has to travel 3 pixels before it counts as a drag, so a click doesn't nudge a note.
- New notes no longer reuse an id after the parent replaces the `annotations` array. A new id is the next one up from the ids in the array.
- An arrow with no `clockwise` draws clockwise, and its handles in the editor agree. They used to treat one on the west side as counter-clockwise.
- Resizing with the arrow keys holds the left edge still when the anchor isn't on it, the way a drag does.
- Enter that picks a candidate in an IME no longer ends the edit.
- Typing in a note no longer logs Svelte's `ownership_invalid_mutation` warning.
- A chart whose `x` or `y` accessor is a function or an array of keys logs one clear error in edit mode, rather than adding notes with `NaN` positions. Edit mode needs key accessors, like `x="date"`.

Also in this release:

- A note left empty gets the default text, `New note...`. To get an arrow with no label, type a space: a note holding only whitespace is kept as typed.
- An edit that leaves the text as it was saves nothing.
- The config logged to the console writes each date as `new Date("…")`. It used to come out as a string, which a time scale can't place, so a pasted config lost its notes. A config with no dates is logged as the same JSON as before.
- The annotations handed to the save hook are a plain copy rather than the live state, read when the save fires. The console log only runs when there is no save hook.
- On a touch screen, dragging a note or one of its handles in edit mode moves it rather than scrolling the page. Published charts still scroll under a finger.
- In static mode, `data-id` holds the annotation's `id` and sits on the `.layercake-annotation` element, as it does in edit mode. It used to hold the index, on `.static-wrapper`.
- Both modes draw the annotation box with one component, so the box carries an `annotation-box` class next to `static-wrapper` or `draggable`.
- Removed three types nothing used: `AnnotationBox`, `LayerCakeScales` and `Point`. Added `ResolvedAnnotation` and `ResolvedArrow`, an annotation and an arrow with every default filled in.

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
