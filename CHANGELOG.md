# Changelog

# 2.0.0

> 2026-09-26

This release changes what the `AnnotationsEditor` component is. In 1.x it was the editor and nothing else: the notes, their arrows and their handles. To switch editing on and off, or to get the annotations out of the browser, you built your own controls. In 2.0.0, `AnnotationsEditor` comes with those controls built in. The bare editor is still available as `AnnotationsEditorPlain`. And `Annotations` is now the editor while you develop and the static notes in a production build.

**BREAKING CHANGE**: `AnnotationsEditor` now draws its own editing controls. A colored outline goes around the chart's plotting area, the region inside the axes where a click adds a note. A small tab in the outline's top-right corner has two controls:

- an **Editable** checkbox, which switches between editing the notes and seeing them as a published chart will show them;
- a **Copy** button, which copies the annotations to the clipboard as JavaScript you can paste straight into your code (the same text `onsave` receives).

Its props are `annotations` and `editable` props – both bindable – and `onsave`. It is meant for placing notes while you build a chart. A published chart should use `AnnotationsStatic`, which leaves out the interface code. The README's Production builds section shows how to switch between them.

**BREAKING CHANGE**: the 1.x `AnnotationsEditor`, the editor with no controls of its own, is no longer exported under that name. `<AnnotationsEditorPlain bind:annotations {onsave} />` is the same component under its new name.

**BREAKING CHANGE**: `Annotations` changed. In 1.x it showed the editor or the static notes as its `editable` prop said, in every build. In 2.0.0 it is `AnnotationsEditor`, frame included, while you develop, and always the static notes in a production build. Its `editable` prop now sets the frame's checkbox. For the 1.x behavior, swap `AnnotationsEditorPlain` and `AnnotationsStatic` in an `{#if editable}` of your own.

**New**: `Annotations` is the component most charts want. The bundler leaves the editor's code out of a production build, so you no longer need an `{#if}` of your own to switch between editor and static notes. A new `hideTools` prop shows the static notes while you develop too. It has no effect in a production build.

**BREAKING CHANGE**: editing no longer prints the annotations to the browser console. In 1.x, if you passed no `onsave`, the annotations were logged a second after every edit so you could copy them from there. Now, with no `onsave` and no `saveAnnotationConfig` function in context, nothing happens after an edit. To get the annotations out, press Copy, pass `onsave`, or call the new `serializeAnnotations` function.

**BREAKING CHANGE**: Option+click (Alt+click) on an annotation no longer steps its anchor point through nine preset positions. Drag the anchor's diamond to put it anywhere in the box, or nudge it with the arrow keys once the diamond has focus.

| In 1.x                                              | In 2.0.0                                                                                                                                            |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<AnnotationsEditor bind:annotations />`            | `<AnnotationsEditorPlain bind:annotations />`, or `<Annotations>` to get the built-in controls while you develop and the static notes in production |
| `<Annotations bind:annotations {editable} />`       | `{#if editable}<AnnotationsEditorPlain bind:annotations />{:else}<AnnotationsStatic {annotations} />{/if}`                                          |
| The annotations logged to the console after an edit | The Copy button, `onsave`, or `serializeAnnotations($state.snapshot(annotations))`                                                                  |

**New**: `serializeAnnotations` is exported. It turns an annotations array into JavaScript text. The text reads like JSON, except that each date is written as `new Date("…")`, so it loads back as a date. Copy and `onsave` produce the same text. Use it if you use `AnnotationsEditorPlain` with your own Copy button.

**New**: a Vite plugin, `annotations()` from `@mhkeller/layercake-annotations/vite`, and `saveTo(file)`, which returns an `onsave` that writes the config into a file in your project while you work. Saving to a file used to mean writing your own server endpoint. Now it takes the plugin in `vite.config.js` and `onsave={saveTo('src/routes/annotations.js')}`. The plugin runs only on the dev server, only accepts saves from the dev server's own pages, only writes existing files whose names end in `annotations.js`, unless you set `include`, and only replaces data with data: it won't write code, or overwrite a file that holds any. A save doesn't reload the page, and an edit still waiting to be saved is sent when the page reloads or closes. The README's Saving to a file in your project section shows the setup.

**New**: the outline's colors and font can be set with CSS custom properties: `--layercake-annotations-frame-color`, `--layercake-annotations-frame-color-editable`, `--layercake-annotations-frame-ink`, `--layercake-annotations-frame-focus` and `--layercake-annotations-frame-font`. The README lists what each one sets and its default.

**New**: TypeScript types for each component's props: `AnnotationsProps`, `AnnotationsEditorProps` and `AnnotationsStaticProps`. Each prop's description includes its default, so your editor shows it on hover.

Fixes:

- Hovering a note and pressing Backspace or Delete removes the note. The key used to do nothing while any `<input>` had focus, including a checkbox like the new Editable switch, because the editor treated every input as a place you were typing. Now only inputs you type into, like text fields, block it.
- Clicking outside a note while you are editing its text now ends the edit before the click reaches anything else on the page. In Safari and Firefox on macOS, clicking a button doesn't move focus to it, so the edit used to still be open when the button's click handler ran. A button that read the annotations, like a Copy button, got the text from before the edit.

Also in this release:

- The README has a new Production builds section. It shows how to use the editor in development and `AnnotationsStatic` in production, with no editor code in the production build.

# 1.1.0

> 2026-09-20

**New**: an `onsave` prop on `<Annotations>` and `<AnnotationsEditor>`. It is called a second after the last edit with the config as JavaScript text, ready to paste into a chart or write to a `.js` file. A second argument holds a plain copy of the annotations as data. Without `onsave` the text is logged to the console for copy-paste.

**New**: a `saveAnnotationConfig` function set in context is documented, for an app that mounts a chart it didn't write and so has no prop to pass. It is handed the annotations, as it was in 1.0.0, and they arrive as a plain copy rather than the live state. `onsave` wins when both are there.

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
