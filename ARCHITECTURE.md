# Architecture

This document explains the internal architecture and design decisions of LayerCake Annotations.

## Overview

LayerCake Annotations adds interactive text annotations with swoopy arrows to LayerCake charts. It supports both **edit mode** (interactive) and **static mode** (read-only).

## Component Hierarchy

```
Annotations.svelte          # Entry point - switches based on `editable` prop
├── Editor.svelte           # Edit mode: state management, context providers
│   ├── Arrows.svelte       # SVG arrow rendering
│   └── AnnotationEditor.svelte (×N)
│       ├── Draggable.svelte
│       │   ├── EditableText.svelte
│       │   └── ResizeHandles.svelte
│       └── ArrowZone.svelte (×2: west, east)
│
└── Static.svelte           # Read-only mode
    ├── Arrows.svelte
    └── AnnotationsData.svelte
```

## Coordinate Systems

The library juggles three coordinate systems:

| System | Used For | Example |
|--------|----------|---------|
| **Data space** | Storing annotation/arrow positions | `{ date: new Date('2024-01-15'), value: 42 }` |
| **Percentage offsets** | Fine-tuning position relative to chart | `dx: 5` = 5% of chart width |
| **Pixels** | Rendering, drag interactions | `sourceX: 150, sourceY: 200` |

### Annotation Position

```
Final pixel position = scale(dataValue) + (percentage / 100) × chartDimension
```

### Arrow Coordinates

- **Source**: Stored as pixel offsets from annotation edge
- **Target**: Stored in data space with optional percentage offsets (for ordinal scales)

## State Management

### Context-based State

Edit mode shares state via Svelte context using reactive refs:

```javascript
// Editor.svelte creates refs
const hovering = createRef(null);
setContext('hovering', hovering);

// Child components read/write
const hovering = getContext('hovering');
hovering.value = { annotationId: 0, type: 'arrow' };
```

### Context Values

| Key | Type | Purpose |
|-----|------|---------|
| `hovering` | `HoverState \| null` | Which element is hovered (shows handles) |
| `moving` | `boolean` | Whether a drag is in progress |
| `isEditing` | `boolean` | Whether text is being edited |
| `previewArrow` | `DragState \| null` | Live arrow coordinates during drag |
| `modifyAnnotation` | `function` | Update annotation properties |
| `setArrow` | `function` | Create or update an arrow |
| `modifyArrow` | `function` | Modify specific arrow properties |

## Design Decisions

### Why `previewArrow` instead of directly modifying arrows?

**Problem**: During drag, we need smooth 60fps updates. Arrow data is stored in data space, but dragging operates in pixels.

**Solution**: Use separate ephemeral state for the drag preview.

```
User drags handle
    ↓
Update previewArrow (pixel coordinates) ← fast, every frame
    ↓
Arrows.svelte renders dragPath from previewArrow
    ↓
User releases mouse
    ↓
Convert pixels → data space → call setArrow() ← expensive, once
    ↓
Clear previewArrow → normal rendering resumes
```

**Benefits**:
1. **Performance**: No coordinate conversions during drag
2. **New arrows**: Can render arrow before it exists in data
3. **Clean rendering**: Hide saved arrow while preview renders (no double-render)
4. **Atomic commits**: Only persist on mouse release

### Why percentage offsets instead of pure data coordinates?

Annotations often need to be positioned *near* a data point but not exactly on it (to avoid overlapping the chart line). Percentage offsets allow:

- Consistent visual offset regardless of scale domain
- Easy manual adjustment (`dx: 5` = "5% to the right")
- Works with both linear and ordinal scales

### Why separate Editor and Static components?

1. **Bundle size**: Static mode doesn't need drag handlers, context, etc.
2. **Simplicity**: Static rendering is just a loop with positioning
3. **Security**: No edit functionality exposed in read-only mode

## Key Modules

### `coordinates.js`

Centralizes all position calculations to prevent drift between components:

```javascript
getAnnotationBox(anno, scales)     // Annotation position/size in pixels
getArrowSource(anno, arrow, scales) // Arrow source in pixels
getArrowTarget(arrow, scales)       // Arrow target in pixels
calculateSourceDx(pixelX, ...)      // Convert pixel → stored offset
```

### `invertScale.js`

Converts pixel positions back to data values. Handles both linear and ordinal scales:

```javascript
const [dataValue, percentOffset] = invertScale(scale, pixelPosition);
// For linear: percentOffset is always 0
// For ordinal: percentOffset is position within the band (0-100)
```

### `arrowUtils.js`

Generates SVG arc paths:

```javascript
createArrowPath(source, target, clockwise, angle)
// Returns: "M 100,50 a 75,75 0 0,1 100,50"
```

## Data Flow

### Creating an annotation

```
Click on chart
    ↓
Editor.onclick() creates annotation object
    ↓
Push to annotations array (reactive)
    ↓
AnnotationEditor renders at click position
    ↓
saveAnnotationConfig_debounced() persists
```

### Creating an arrow

```
Hover annotation → ArrowZone handles appear
    ↓
Drag handle → onTargetMousedown()
    ↓
mousemove updates previewArrow (pixels)
    ↓
Arrows.svelte renders dragPath
    ↓
mouseup → convert to data space → setArrow()
    ↓
Clear previewArrow, arrow now in annotation.arrows
```

### Toggling arrow curve direction

```
Cmd+click on arrow handle or path
    ↓
Cycle: clockwise → null (straight) → counter-clockwise
    ↓
modifyArrow(id, side, { clockwise: newValue })
    ↓
Arrow re-renders with new curve
```

## Testing

Visual regression tests using Playwright:

- `tests/annotations.test.js` - Linear scale chart
- `tests/ordinal.test.js` - Ordinal (bar) chart

Run with:
```bash
pnpm test                                    # Run tests
pnpm exec playwright test --update-snapshots # Update baselines
```

