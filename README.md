# LayerCake Annotations

[![npm version](https://img.shields.io/npm/v/@mhkeller/layercake-annotations.svg)](https://www.npmjs.com/package/@mhkeller/layercake-annotations)
[![npm downloads](https://img.shields.io/npm/dm/@mhkeller/layercake-annotations.svg)](https://www.npmjs.com/package/@mhkeller/layercake-annotations)
[![Tests](https://github.com/mhkeller/layercake-annotations/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/mhkeller/layercake-annotations/actions/workflows/test.yml)
[![Deploy demo](https://github.com/mhkeller/layercake-annotations/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/mhkeller/layercake-annotations/actions/workflows/deploy.yml)

Add interactive text annotations with swoopy arrows to [LayerCake](https://layercake.graphics) charts.

**[Try the demo](https://mhkeller.github.io/layercake-annotations/)**

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

Layer Cake fills its parent, so give the parent a height.

Edit mode stores each position in `data` under the chart's x and y keys, so it needs accessors that are keys, like `x="date"` and `y="value"`. A function or an array of keys gives a position nowhere to be stored: annotations can't be added or moved, and the editor logs an error to the console saying so.

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

**Moving the anchor point:**

- Hover an annotation to show its anchor as a small diamond
- Drag the diamond to put the anchor anywhere in the box
- Option+click (Alt+click) the annotation to jump between nine presets, clockwise from top-left
- Arrow keys nudge it 5% at a time once the diamond has focus

Some desktops take Alt+click for themselves, as some Linux window managers do to move windows. There, drag the diamond or use its arrow keys.

**Creating arrows:**

- Hover over annotation to reveal handles on west/east edges
- Drag a handle outward to create an arrow
- Drag the handle at either end of an arrow to move that end
- Cmd+click (Ctrl+click on Windows and Linux) an arrow's handle to cycle it: curved → straight → curved the other way
- Hover an arrow's handle + Delete/Backspace to remove the arrow

## Props

| Prop          | Type                                                  | Default             | Description                                                                           |
| ------------- | ----------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------- |
| `annotations` | `Annotation[]`                                        | `[]`                | Array of annotation objects (bindable)                                                |
| `editable`    | `boolean`                                             | `true`              | Enable editing. Set `false` for read-only display                                     |
| `onsave`      | `(source: string, annotations: Annotation[]) => void` | Logs to the console | Called a second after the last edit, with the config as JavaScript text, then as data |

**Note:** The `annotations` prop uses Svelte 5's `$bindable` for two-way binding. For edits to persist, the parent component must store annotations in a `$state` variable:

```
let annotations = $state([]);             // ✓ edits persist
let annotations = [];                     // ✗ edits won't persist
import annotations from 'annotations.js'  // ✗ edits won't persist
```

### Saving

Pass `onsave` to do something with the config whenever it changes. It runs one second after the last edit, or straight away if edit mode is switched off while a save is waiting.

It is handed `source`: the config as JavaScript text, ready to paste into a chart or write to a `.js` file. It reads like `JSON.stringify(annotations, null, 2)`, with each date written as `new Date("2024-03-15T00:00:00.000Z")`. With no dates in the config it is exactly that JSON.

Without `onsave`, `source` is logged to the browser console, ready to copy into your chart.

While you work on a chart, you can keep the config in a file the chart imports. Start the file like this:

```js
// src/routes/annotations.js
export default [];

if (import.meta.hot) import.meta.hot.accept();
```

The page starts from the file and posts `source` to an endpoint, which writes it back:

```svelte
<!-- src/routes/+page.svelte -->
<script>
	import saved from './annotations.js';

	let annotations = $state(saved);

	function onsave(source) {
		fetch('/api/annotations', { method: 'POST', body: source });
	}
</script>

<Annotations bind:annotations {onsave} />
```

```js
// src/routes/api/annotations/+server.js
import { writeFile } from 'node:fs/promises';
import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';

export async function POST({ request, url }) {
	// Only in dev, and only from the chart's own page.
	if (!dev || request.headers.get('origin') !== url.origin) error(403);

	const source = await request.text();
	await writeFile(
		'src/routes/annotations.js',
		`export default ${source};\n\nif (import.meta.hot) import.meta.hot.accept();\n`
	);
	return new Response(null, { status: 204 });
}
```

The `import.meta.hot` line tells Vite to take the new file quietly. Without it, Vite rebuilds the page each time the file is written, which closes a note you are typing in. The chart reads the file when the page loads, so a reload shows what was saved. A build leaves the line out.

The endpoint writes what it is sent into a file your dev server then runs, which is why it answers only in dev and only to the chart's own page.

`source` is JavaScript, so it is read by importing the file, not with `JSON.parse`.

#### Saving from an app that hosts the chart

An app that mounts a chart someone else wrote doesn't render `<Annotations>`, so it has no prop to pass. It can put a function in context instead, under the key `saveAnnotationConfig`, and any editor below picks it up. It is called at the same moments as `onsave`, and `onsave` wins when both are there.

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

It is handed `annotations` alone: a plain copy of the config as data, where a date is a real `Date`. An app like this checks what it is sent and writes the file itself, so data is what it wants. `onsave` gets the same copy as its second argument, after `source`.

If you store the config as JSON, a date comes back as a string, and a time scale can't place a string. Turn those strings back into `Date` objects when you load the config, the same way you do for your chart's data.

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

| Field                | Default         |
| -------------------- | --------------- |
| `dx`, `dy`           | `0`             |
| `width`              | `155` pixels    |
| `align`              | `'left'`        |
| `anchorX`, `anchorY` | `0`             |
| `style`, `class`     | None            |
| `arrows`             | `[]`, no arrows |

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

The `anchorX` and `anchorY` properties define where the data point "pins" to the annotation box. In edit mode, hovering an annotation shows the anchor as a small diamond. Drag it to put the anchor anywhere in the box, Option+click (Alt+click) the annotation to jump between the presets below, or nudge it with the arrow keys. The annotation stays where it is while the anchor moves — `dx` and `dy` are adjusted to make up the difference.

| anchorX | anchorY | Result                      |
| ------- | ------- | --------------------------- |
| `0`     | `0`     | Top-left anchored (default) |
| `50`    | `50`    | Center anchored             |
| `100`   | `0`     | Top-right anchored          |
| `50`    | `100`   | Bottom-center anchored      |

Dragging reaches any value in between. The Option+click cycle visits these nine.

### Arrow structure

An arrow's `source.dx` is pixels from the near edge of the annotation, and its `source.dy` is pixels down from the **anchor point**. The two use different origins on purpose: the box's width is stored in the config, so its edges are known, but its height comes out of how the text wraps, so the anchor point is the only vertical position that can be worked out without measuring the page. That is what lets a published chart draw its arrows correctly without measuring anything.

To put an arrow at the middle or the bottom of the box, move the anchor there with `anchorY` and leave `source.dy` at 0. The browser resolves `anchorY` against the real box, so it keeps working when the text re-wraps.

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

	let editable = $state(true);
</script>

<label>
	<input type="checkbox" bind:checked={editable} /> Edit mode
</label>

<div class="chart-container">
	<LayerCake {data} x="date" y="value">
		<Svg><Line /></Svg>
		<Annotations bind:annotations {editable} />
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

An annotation's position is stored as a data value plus percentages, so it moves with the chart as the chart resizes. Its box width and arrow offsets are in pixels, so a layout placed on a wide chart can crowd a narrow one. For that, keep a second set placed for narrow charts and switch at a breakpoint, as the [demo](https://mhkeller.github.io/layercake-annotations/) does:

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
</script>

<LayerCake {data} x="date" y="value">
	{#if narrow.current}
		<Annotations bind:annotations={annotationsNarrow} />
	{:else}
		<Annotations bind:annotations />
	{/if}
</LayerCake>
```

Edits change whichever set is showing. To place the narrow set, narrow the window and drag.

## TypeScript

```ts
import type { Annotation, Arrow, OnSaveFn } from '@mhkeller/layercake-annotations';
```

## Components

| Export              | Description                                                 |
| ------------------- | ----------------------------------------------------------- |
| `Annotations`       | Main component – set `editable` prop to toggle modes        |
| `AnnotationsEditor` | Edit mode only. Takes `annotations` (bindable) and `onsave` |
| `AnnotationsStatic` | Read-only mode only. Takes `annotations`                    |

## Development

```sh
pnpm install
pnpm dev          # Start the demo
pnpm test         # Run the unit tests and the Playwright tests
pnpm test:update  # Rebuild the screenshot baselines after a visual change
pnpm package      # Build for npm distribution
```

## Architecture

```
src/lib/
├── Annotations.svelte        # Wrapper: switches Editor/Static based on editable
├── Editor.svelte             # Edit mode: state management, context providers
├── Static.svelte             # Read-only: renders annotations + arrows
├── index.js                  # The package's exports
├── components/
│   ├── AnchorHandle          # Diamond handle for dragging the anchor point
│   ├── AnnotationBox         # The positioned box around the text, drawn the same in both modes
│   ├── AnnotationEditor      # One editable annotation: its box, text, handles and arrow zones
│   ├── ArrowheadMarker       # SVG marker for the arrowheads
│   ├── ArrowZone             # Handles for creating/editing arrows
│   ├── Arrows                # SVG arrow path rendering
│   ├── EditableText          # Contenteditable text input
│   └── ResizeHandles         # Width resize handles
├── modules/
│   ├── anchorPresets.js      # The nine anchor positions Option+click steps through
│   ├── arrowUtils.js         # SVG arc path generation
│   ├── configSource.js       # The config as JavaScript text, with dates written as new Date(...)
│   ├── coordinates.js        # Position calculations, and the defaults for fields left out
│   ├── createRef.svelte.js   # State reference shared between components
│   ├── debounce.js           # Run once the calls stop coming
│   ├── drag.js               # One press-move-release, shared by every drag in the editor
│   ├── invertScale.js        # Pixel → data value conversion
│   ├── modifierKeys.js       # The shortcut key: Cmd on macOS, Ctrl on Windows and Linux
│   ├── newAnnotation.js      # A new annotation at a clicked position
│   ├── noteText.js           # The default text, and the text to store when an edit ends
│   └── ordinalInvert.js      # Pixel → band value for ordinal scales
└── types.d.ts                # TypeScript definitions
```

## Internals

For contributors working on this library.

[ARCHITECTURE.md](ARCHITECTURE.md) has the component hierarchy, the context keys, the coordinate systems, the measurement rule the arrow geometry is built on, the drag lifecycle every handle shares, and where defaults are filled in. Start there.

### Adding a New Arrow Property

1. Update `Arrow` type in `types.d.ts`
2. If it can be left out, give it its default in `resolveArrow` in `coordinates.js` and add it to `ResolvedArrow`
3. Update `ArrowZone.svelte` to read/write the property. Its `onend` builds the arrow that goes to `setArrow`
4. Update `Arrows.svelte` if it affects rendering

### Debugging Coordinate Issues

1. Check that `coordinates.js` functions are used consistently
2. Verify the Layer Cake context is read at the point of use, never destructured at the top of a component
3. For east arrows, remember `dx` is from the RIGHT edge
4. `source.dy` is measured from the anchor point, not from the top of the box
