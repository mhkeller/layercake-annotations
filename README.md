# LayerCake Annotations

[![npm version](https://img.shields.io/npm/v/@mhkeller/layercake-annotations.svg)](https://www.npmjs.com/package/@mhkeller/layercake-annotations)
[![npm downloads](https://img.shields.io/npm/dm/@mhkeller/layercake-annotations.svg)](https://www.npmjs.com/package/@mhkeller/layercake-annotations)
[![Tests](https://github.com/mhkeller/layercake-annotations/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/mhkeller/layercake-annotations/actions/workflows/test.yml)
[![Deploy demo](https://github.com/mhkeller/layercake-annotations/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/mhkeller/layercake-annotations/actions/workflows/deploy.yml)

Add interactive text annotations with swoopy arrows to [LayerCake](https://layercake.graphics) charts.

**[Try the demo](https://mhkeller.github.io/layercake-annotations/)**

## Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Props](#props)
  - [Saving](#saving)
    - [Saving to a file in your project](#autmoatically-saving-to-a-file-in-your-project)
    - [Saving from an app that hosts the chart](#saving-from-an-app-that-hosts-the-chart)
- [Production builds](#production-builds)
- [Bring your own UI](#bring-your-own-ui)
- [Styling the frame](#styling-the-frame)
- [Annotation Data Structure](#annotation-data-structure)
  - [Offsets explained](#offsets-explained)
  - [Anchor point](#anchor-point)
  - [Arrow structure](#arrow-structure)
- [Full Example](#full-example)
- [Different annotations on small screens](#different-annotations-on-small-screens)
- [TypeScript](#typescript)
- [Components](#components)
- [Development](#development)
- [Architecture](#architecture)
- [Internals](#internals)

## Installation

```sh
pnpm add layercake@^11 @mhkeller/layercake-annotations
```

Requires Layer Cake 11 and Svelte 5.40 or newer. `layercake` is a peer dependency, so install it yourself and pin the major — a bare `layercake` will pick up the next major the day it ships.

## Quick Start

```svelte
<script>
	import { LayerCake } from 'layercake';
	import { Annotations } from '@mhkeller/layercake-annotations';

	let annotations = $state([]);
</script>

<div style="height: 300px">
	<LayerCake {data} x="date" y="value">
		<Annotations bind:annotations />
	</LayerCake>
</div>
```

`Annotations` is the component you'll usually want. While you develop, it's the editor, with a built-in interface that lets you turn editing mode on/off as well as a button to copy the serialized annotation data (see [Saving](#saving)). In a production build, it renders the same thing but without the editing code, so clients don't download the editor. See [Production builds](#production-builds) for more, and [Props](#props) for what it takes.

The other components are for when you want to choose yourself:

- `AnnotationsEditor` is the editor with its interface, in development and in production. Use it in an app where people edit annotations on the published site. Its frame can be restyled: see [Styling the frame](#styling-the-frame).
- `AnnotationsEditorPlain` is the same editor without any user interface. You can use that if you want to implement your own, like if you want more integration inside of a larger app. See [Bring your own UI](#bring-your-own-ui).
- `AnnotationsStatic` draws the notes with no editing code. Same as the production version of `Annotations` but feel free to use it directly if you want to be 10,000 percent sure there is no editor code.

[Components](#components) has the full list of exports.

> [!TIP] The frame's border is drawn 4 pixels outside the plotting area. Give `<LayerCake>` a `padding` of at least 4 pixels on each side, or the border spills out of the chart's container. See [Styling the frame](#styling-the-frame) to change how it looks.

**Creating annotations:**

- Click anywhere on the chart to create
- Drag to reposition
- Double-click text to edit
- Hover + Delete/Backspace to remove

**Editing text:**

- Double-click to edit
- Enter to save
- Shift+Enter for line breaks
- Escape, Tab or a click elsewhere also save
- A note left empty gets the default text, `New note...`
- A note holding only spaces is kept as typed, which is how you get an arrow with no label

**Formatting:**

- Cmd+click (Ctrl+click on Windows and Linux) the annotation to cycle text alignment: left → center → right

**Moving the anchor point:** (see [Anchor point](#anchor-point))

- Hover an annotation to show its anchor as a small diamond
- Drag the diamond to put the anchor anywhere in the box
- Arrow keys nudge it 5% at a time once the diamond has focus

**Creating arrows:** (see [Arrow structure](#arrow-structure))

- Hover over annotation to reveal handles on west/east edges
- Drag a handle outward to create an arrow
- Drag the handle at either end of an arrow to move that end
- Cmd+click (Ctrl+click on Windows and Linux) an arrow's handle to cycle it: curved → straight → curved the other way
- Hover an arrow's handle + Delete/Backspace to remove the arrow

## Props

`Annotations`, `AnnotationsEditor` and `AnnotationsEditorPlain` take these props:

| Prop          | Type                                                  | Default          | Description                                                                                                                                                             |
| ------------- | ----------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `annotations` | `Annotation[]`                                        | `[]`             | Array of [annotation objects](#annotation-data-structure) (bindable)                                                                                                    |
| `editable`    | `boolean`                                             | `true`           | Whether editing is on. The frame's Editable checkbox changes it, and you can bind it to read that or to set the starting mode. `AnnotationsEditorPlain` doesn't take it |
| `onsave`      | `(source: string, annotations: Annotation[]) => void` | Nothing is saved | Called a second after the last edit, with the config as JavaScript text, then as data. See [Saving](#saving)                                                            |

`Annotations` also takes `hideTools`, a `boolean` that defaults to `false`. Set it to `true` to see the notes as a production build will, without the editor, while you develop. It has no effect in a production build, which never has the editor (see [Production builds](#production-builds)).

`AnnotationsStatic` takes `annotations` alone.

> [!NOTE] The `annotations` prop of `Annotations`, `AnnotationsEditor` and `AnnotationsEditorPlain` uses Svelte 5's `$bindable` for two-way binding. For edits to persist, the parent component must store annotations in a `$state` variable:

```svelte
<script>
let annotations = $state([]);             // ✓ edits persist
let annotations = [];                     // ✗ edits won't persist
import annotations from 'annotations.js'  // ✗ edits won't persist
</script>
```

### Saving

Nothing is saved for you automatically (but see [below](#autmoatically-saving-to-a-file-in-your-project) about how to do this). The editor changes the `annotations` array in the page, and when you reload the page those edits are gone unless you've kept them. There are two ways to get save them.

**1. By hand, with Copy.** The Copy button in the `AnnotionsEditor` component will copy the config as JavaScript, ready to paste into your chart or into a `.js` file. It reads like `JSON.stringify(annotations, null, 2)`, except that each date is written as `new Date("2024-03-15T00:00:00.000Z")` so it loads back as a date. With no dates in the annotations, it is exactly that JSON.

**2. Programatically, with `onsave`.** Pass a function to the `onsave` prop and the editor will call it one second after your last edit, or straight away if you switch editing off while a save is waiting. It gets two arguments: `source`, the same text Copy gives, then the annotations as plain data.

It's still on you to figure out what to do with this data, though. However, there is a [built in way to write this out to a file](#autmoatically-saving-to-a-file-in-your-project), and an app that mounts the chart can [pass a save function through context](#saving-from-an-app-that-hosts-the-chart).

#### Autmoatically saving to a file in your project

The library exposes a Vite plugin and some configuration that will automatically write the config into a file the chart imports.

Add the plugin to your Vite config like so:

```js
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { annotations } from '@mhkeller/layercake-annotations/vite';

export default {
	plugins: [sveltekit(), annotations()]
};
```

Create the file the config will live in:

```js
// src/routes/annotations.js
export default [];
```

Then start the chart from the file, and pass `saveTo` the same file, from your project's root:

```svelte
<!-- src/routes/+page.svelte -->
<script>
	import { Annotations, saveTo } from '@mhkeller/layercake-annotations';
	import saved from './annotations.js';

	let annotations = $state(saved);
</script>

<Annotations bind:annotations onsave={saveTo('src/routes/annotations.js')} />
```

[`src/routes/save-to-file`](src/routes/save-to-file) in this repo is the whole setup as a working example. Run `pnpm dev` and open [localhost:5173/save-to-file](http://localhost:5173/save-to-file), and every edit is written into its `chart.annotations.js`. The [published demo](https://mhkeller.github.io/layercake-annotations/save-to-file) can't save, because the plugin only runs on the dev server.

Some notes about its reload behavior:

* Each save rewrites the file as `export default [...];`, so any other changes will be overwritten.
* The page doesn't reload when the file changes, so a note you are typing in won't get clobbered.
* A reload reads the file. An edit still waiting to be saved is sent as the page goes.
* Edit the file by hand and the page updates as usual.

The plugin only runs on the dev server. A build doesn't include it and so a published chart can't write anything. Because the file is code your dev server runs, the plugin turns a save down unless:

- it comes from a page on the dev server itself;
- the file is inside your project, and its name ends in `annotations.js`, like `annotations.js` or `gdp.annotations.js`;
- the file already exists, and holds a config and nothing else, like the `export default [];` you start it with. The plugin won't create a file, or replace one that holds code.

It also turns down a config that contains anything but data: arrays, objects, strings, numbers, `true`, `false`, `null` and `new Date("…")`, which is all the editor writes. So nothing that reaches the dev server can put code in the file.

To allow other names, pass globs from your project's root: `annotations({ include: 'src/charts/**/*.notes.js' })`. The default only matches `.js` files, so a [TypeScript](#typescript) project either keeps the config in a `.js` file or sets `include`. If a save is turned down, the reason is logged in the browser console.

`saveTo` works in any Vite app, not only SvelteKit. To send the config somewhere else, write your own `onsave`. It is handed `source` and the annotations, as above. `source` is JavaScript, so a file holding it is read by importing it, not with `JSON.parse`.

#### Saving from an app that hosts the chart

There's one another way to pass the library a save function: you can put a function in a Svelte context instead under the key `saveAnnotationConfig`, and any editor below picks it up. It is called at the same moments as [`onsave`](#saving), and `onsave` wins when both are there.

```js
import { mount } from 'svelte';

mount(Chart, {
	target,
	context: new Map([
		[
			'saveAnnotationConfig',
			(annotations) => {
				// Check the data, then write it out on your server.
			}
		]
	])
});
```

This is useful if you want to handle the file-writing from a parent component and avoid futzing with the main chart file.

It is handed `annotations` alone: a plain copy of the config as data, where a date is a real `Date`. An app like this checks what it is sent and writes the file itself, so data is what it wants. `onsave` gets the same copy as its second argument, after `source`.

If you store the config as JSON, a date comes back as a string, and a time scale can't place a string. Turn those strings back into `Date` objects when you load the config, the same way you do for your chart's data.

## Production builds

The editor is for placing notes and the people reading a published chart shouldn't waste their precious bandwidth downloading it.

[`Annotations`](#quick-start) takes care of this for you. In a production build it is `AnnotationsStatic`, which draws the same notes and arrows with no editing code, and the bundler leaves the editor out. It goes by the build's mode, not by whether the dev server is running: `vite build --mode development` keeps the editor, and `vite preview` shows the static notes.

`AnnotationsEditor` and `AnnotationsEditorPlain` always include the editor. If you use one of them, for instance to [bring your own UI](#bring-your-own-ui), make the switch yourself:

```svelte
<LayerCake {data} x="date" y="value">
	{#if import.meta.env.DEV}
		<AnnotationsEditorPlain bind:annotations />
	{:else}
		<AnnotationsStatic {annotations} />
	{/if}
</LayerCake>
```

## Bring your own UI

If the frame and its tab don't fit your page, and [restyling them](#styling-the-frame) isn't enough, use `AnnotationsEditorPlain` instead. It is the same editor without the frame, the checkbox or the Copy button. You supply your own controls: a checkbox of your own that swaps it for `AnnotationsStatic`, and a Copy button built on `serializeAnnotations`, which turns the annotations into the same text the built-in Copy button gives:

```svelte
<script>
	import {
		AnnotationsEditorPlain,
		AnnotationsStatic,
		serializeAnnotations
	} from '@mhkeller/layercake-annotations';

	let annotations = $state([]);
	let editable = $state(true);

	function copy() {
		navigator.clipboard.writeText(serializeAnnotations($state.snapshot(annotations)));
	}
</script>

<label><input type="checkbox" bind:checked={editable} /> Edit mode</label>
<button onclick={copy}>Copy config</button>

<LayerCake {data} x="date" y="value">
	{#if editable}
		<AnnotationsEditorPlain bind:annotations />
	{:else}
		<AnnotationsStatic {annotations} />
	{/if}
</LayerCake>
```

To save edits as you go, pass `onsave` too, as in [Saving](#saving). To leave the editor out of the published chart, add the switch from [Production builds](#production-builds).

## Styling the frame

The frame and its tab come styled, so they need no stylesheet from you. To change their colors or font, set these CSS custom properties on the chart's container, or any element above it:

| Property                                       | Default                 | What it sets                                                 |
| ---------------------------------------------- | ----------------------- | ------------------------------------------------------------ |
| `--layercake-annotations-frame-color`          | `#e2dbcc`               | The frame and the tab while editing is off                   |
| `--layercake-annotations-frame-color-editable` | `#f4b400`               | The frame and the tab while editing is on, and the checkmark |
| `--layercake-annotations-frame-ink`            | `#141414`               | The tab's text, the checkbox, and the Copy button's border   |
| `--layercake-annotations-frame-focus`          | `#1f4e9c`               | The focus ring on the checkbox and the button                |
| `--layercake-annotations-frame-font`           | `system-ui, sans-serif` | The tab's font                                               |

```css
.chart-container {
	--layercake-annotations-frame-color-editable: #ffd166;
	--layercake-annotations-frame-font: 'Jost', sans-serif;
}
```

For anything the properties don't cover, write CSS for the frame, `.layercake-annotations-frame`, or the tab, `.layercake-annotations-tab`. The frame also has an `editable` class while editing is on. Svelte adds a hidden class to the frame's own rules, so a rule of yours needs one extra class, like the container's, to win. In a Svelte component, wrap the frame's class in `:global()` so Svelte doesn't scope it to your component:

```css
.chart-container :global(.layercake-annotations-tab) {
	font-size: 13px;
}
```

## Annotation Data Structure

```js
{
  id: 0,                           // Unique number. Edit mode finds the annotation to change by it
  data: {
    date: new Date('2024-03-15'),  // X value (matches LayerCake x accessor)
    value: 42                      // Y value (matches LayerCake y accessor)
  },
  text: 'Peak value',              // Annotation text (supports line breaks)
  dx: 5,                           // Optional: X offset, percentage of chart width (-100 to 100)
  dy: -10,                         // Optional: Y offset, percentage of chart height (-100 to 100)
  width: '120px',                  // Optional: fixed width
  align: 'left',                   // Optional: 'left', 'center', or 'right'
  anchorX: 0,                      // Optional: anchor X position (0-100% of width)
  anchorY: 0,                      // Optional: anchor Y position (0-100% of height)
  style: 'background: yellow;',    // Optional: inline CSS styles
  class: 'highlight',              // Optional: CSS class name(s)
  arrows: []                       // Optional: array of arrows (see below)
}
```

`id`, `data` and `text` are required. The rest can be left out:

| Field                | Default                                                  |
| -------------------- | -------------------------------------------------------- |
| `dx`, `dy`           | `0`, see [Offsets explained](#offsets-explained)         |
| `width`              | `155` pixels                                             |
| `align`              | `'left'`                                                 |
| `anchorX`, `anchorY` | `0`, see [Anchor point](#anchor-point)                   |
| `style`, `class`     | None                                                     |
| `arrows`             | `[]`, no arrows. See [Arrow structure](#arrow-structure) |

An annotation made by clicking the chart starts at `91px` wide.

### Offsets explained

The `dx` and `dy` values are **percentages of the chart dimensions** (not decimals 0–1).

| Value     | Meaning                                      |
| --------- | -------------------------------------------- |
| `dx: 0`   | Annotation left edge aligned with data point |
| `dx: 10`  | Shifted right by 10% of chart width          |
| `dx: -5`  | Shifted left by 5% of chart width            |
| `dy: -15` | Shifted up by 15% of chart height            |

### Anchor point

The `anchorX` and `anchorY` properties define where the data point "pins" to the annotation box. In edit mode, hovering an annotation shows the anchor as a small diamond. Drag it to put the anchor anywhere in the box, or nudge it with the arrow keys. The annotation stays where it is while the anchor moves — [`dx` and `dy`](#offsets-explained) are adjusted to make up the difference.

| anchorX | anchorY | Result                      |
| ------- | ------- | --------------------------- |
| `0`     | `0`     | Top-left anchored (default) |
| `50`    | `50`    | Center anchored             |
| `100`   | `0`     | Top-right anchored          |
| `50`    | `100`   | Bottom-center anchored      |

Any value from 0 to 100 works.

### Arrow structure

An arrow's `source.dx` is pixels from the near edge of the annotation, and its `source.dy` is pixels down from the **anchor point**. The two use different origins on purpose: the box's width is stored in the config, so its edges are known, but its height comes out of how the text wraps, so the anchor point is the only vertical position that can be worked out without measuring the page. That is what lets a published chart draw its arrows correctly without measuring anything.

To put an arrow at the middle or the bottom of the box, move the anchor there with [`anchorY`](#anchor-point) and leave `source.dy` at 0. The browser resolves `anchorY` against the real box, so it keeps working when the text re-wraps.

An arrow you draw in edit mode leaves from the middle of the annotation's edge, so its `source.dy` comes out as half the box's height. That is why the handle stays put when you move the anchor. It starts out curving clockwise on the east side and counter-clockwise on the west.

```js
{
  side: 'east',                    // 'west' or 'east' - which side of annotation
  clockwise: true,                 // Optional: true = clockwise curve, false = counter-clockwise, null = straight
  source: {                        // Optional, and so is each offset in it
    dx: 12,                        // Pixels from the near edge of the annotation
    dy: 15                         // Pixels down from the anchor point
  },
  target: {
    data: {
      date: new Date('2024-03-15'),  // X data value (matches LayerCake x accessor)
      value: 42                      // Y data value
    },
    dx: 0,                         // Optional: % of chart width, for ordinal X scales
    dy: 0                          // Optional: % of chart height, for ordinal Y scales
  }
}
```

`side` and `target.data` are required. The rest can be left out:

| Field                    | Default                                                                    |
| ------------------------ | -------------------------------------------------------------------------- |
| `clockwise`              | `true`                                                                     |
| `source.dx`              | `12` on the east side, `-12` on the west: 12 pixels out from the near edge |
| `source.dy`              | `0`, level with the anchor point                                           |
| `target.dx`, `target.dy` | `0`                                                                        |

Editing in the browser may write defaults out in full, for the annotation and for its arrows. Moving the anchor, for example, saves the annotation's `dx` and `dy`, and saves each arrow with its `clockwise`, `source` and `target` offsets filled in. A filled-in default draws the same as one left out.

## Full Example

```svelte
<script>
	import { LayerCake, Svg } from 'layercake';
	import { Annotations } from '@mhkeller/layercake-annotations';
	import Line from './Line.svelte';

	let data = [
		/* your data */
	];
	let annotations = $state([
		{
			id: 0,
			data: {
				date: new Date('2024-06-01'),
				value: 150
			},
			dx: 2,
			dy: -8,
			text: 'Summer peak',
			width: '100px',
			arrows: [
				{
					side: 'west',
					clockwise: false,
					source: { dx: -12, dy: 0 },
					target: {
						data: { date: new Date('2024-06-01'), value: 150 },
						dx: 0,
						dy: 0
					}
				}
			]
		}
	]);
</script>

<div class="chart-container">
	<LayerCake {data} x="date" y="value">
		<Svg><Line /></Svg>
		<Annotations bind:annotations />
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 100%;
		height: 250px;
	}
</style>
```

## Different annotations on small screens

An annotation's position is stored as a data value plus [percentages](#offsets-explained), so it moves with the chart as the chart resizes. Its box width and [arrow offsets](#arrow-structure) are in pixels, so a layout placed on a wide chart can crowd a narrow one. For that, keep a second set placed for narrow charts and switch at a breakpoint, as the [demo](https://mhkeller.github.io/layercake-annotations/) does:

```svelte
<script>
	import { MediaQuery } from 'svelte/reactivity';

	const narrow = new MediaQuery('max-width: 799px');

	let annotations = $state([
		/* placed for a wide chart */
	]);
	let annotationsNarrow = $state([
		/* placed for a narrow chart */
	]);
	let editable = $state(true);
</script>

<LayerCake {data} x="date" y="value">
	{#if narrow.current}
		<Annotations bind:annotations={annotationsNarrow} bind:editable />
	{:else}
		<Annotations bind:annotations bind:editable />
	{/if}
</LayerCake>
```

Edits and Copy act on whichever set is showing. To place the narrow set, narrow the window and drag. Binding [`editable`](#props) in the page keeps the switch's state when the breakpoint swaps editors.

## TypeScript

```ts
import type {
	Annotation,
	Arrow,
	OnSaveFn,
	AnnotationsProps,
	AnnotationsEditorProps,
	AnnotationsEditorPlainProps,
	AnnotationsStaticProps
} from '@mhkeller/layercake-annotations';
```

## Components

| Export                   | Description                                                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Annotations`            | `AnnotationsEditor` while you develop, `AnnotationsStatic` in a production build. See [Production builds](#production-builds)                                              |
| `AnnotationsEditor`      | The editor, with a frame around the plotting area and a tab holding an Editable checkbox and a Copy button, in production too. See [Styling the frame](#styling-the-frame) |
| `AnnotationsEditorPlain` | The same editor with no controls of its own. See [Bring your own UI](#bring-your-own-ui)                                                                                   |
| `AnnotationsStatic`      | Draws the notes and arrows with no editing code. See [Production builds](#production-builds)                                                                               |

`serializeAnnotations` is exported too. `serializeAnnotations($state.snapshot(annotations))` returns the annotations as JavaScript text, the same text Copy and `onsave` give. See [Bring your own UI](#bring-your-own-ui).

The prop types are listed under [TypeScript](#typescript).

`saveTo(file)` returns an `onsave` that writes the config into `file`, with the Vite plugin exported from `@mhkeller/layercake-annotations/vite`. See [Saving](#saving).

## Development

```sh
pnpm install
pnpm dev          # Start the demo
pnpm test         # Run the unit tests and the Playwright tests
pnpm test:update  # Rebuild the screenshot baselines after a visual change
pnpm package      # Build for npm distribution
```

## Architecture

The source files, in brief. [ARCHITECTURE.md](ARCHITECTURE.md) explains how they fit together.

```
src/lib/
├── Annotations.svelte        # AnnotationsEditor in dev, Static in a production build
├── AnnotationsEditor.svelte  # EditFrame, plus Editor or Static as its checkbox says
├── Editor.svelte             # Edit mode: state management, context providers. Exported as AnnotationsEditorPlain
├── Static.svelte             # Read-only: renders annotations + arrows. Exported as AnnotationsStatic
├── index.js                  # The package's exports
├── vite.js                   # The Vite plugin that writes a saved config to a file. Exported as /vite
├── components/
│   ├── AnchorHandle          # Diamond handle for dragging the anchor point
│   ├── AnnotationBox         # The positioned box around the text, drawn the same in both modes
│   ├── AnnotationEditor      # One editable annotation: its box, text, handles and arrow zones
│   ├── ArrowheadMarker       # SVG marker for the arrowheads
│   ├── ArrowZone             # Handles for creating/editing arrows
│   ├── Arrows                # SVG arrow path rendering
│   ├── EditableText          # Contenteditable text input
│   ├── EditFrame             # The frame around the plotting area, and its tab: the switch and Copy
│   └── ResizeHandles         # Width resize handles
├── modules/
│   ├── arrowUtils.js         # SVG arc path generation
│   ├── coordinates.js        # Position calculations, and the defaults for fields left out
│   ├── createRef.svelte.js   # State reference shared between components
│   ├── debounce.js           # Run once the calls stop coming
│   ├── drag.js               # One press-move-release, shared by every drag in the editor
│   ├── invertScale.js        # Pixel → data value conversion
│   ├── modifierKeys.js       # The shortcut key: Cmd on macOS, Ctrl on Windows and Linux
│   ├── newAnnotation.js      # A new annotation at a clicked position
│   ├── noteText.js           # The default text, and the text to store when an edit ends
│   ├── ordinalInvert.js      # Pixel → band value for ordinal scales
│   ├── saveTo.js             # An onsave that posts the config to the Vite plugin
│   └── serializeAnnotations.js  # The config as JavaScript text, with dates written as new Date(...)
└── types.d.ts                # TypeScript definitions
```

## Internals

For contributors working on this library.

[ARCHITECTURE.md](ARCHITECTURE.md) has the component hierarchy, the context keys, the coordinate systems, the measurement rule the arrow geometry is built on, the drag lifecycle every handle shares, where defaults are filled in, and how the frame's tab sits above the notes. Start there.

### Adding a New Arrow Property

1. Update `Arrow` type in `types.d.ts`
2. If it can be left out, give it its default in `resolveArrow` in `coordinates.js` and add it to `ResolvedArrow`
3. Update `ArrowZone.svelte` to read/write the property. Its `onend` builds the arrow that goes to `setArrow`
4. Update `Arrows.svelte` if it affects rendering

### Debugging Coordinate Issues

1. Check that `coordinates.js` functions are used consistently
2. Verify the Layer Cake context is read at the point of use, never destructured at the top of a component
3. For east arrows, remember `dx` is from the RIGHT edge (see [Arrow structure](#arrow-structure))
4. `source.dy` is measured from the [anchor point](#anchor-point), not from the top of the box
