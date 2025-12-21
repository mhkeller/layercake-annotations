/**
 * Type definitions for layercake-annotations
 */

/**
 * Arrow source position (pixel offsets from annotation edge)
 */
export interface ArrowSource {
	/** X offset in pixels from annotation edge (west=left, east=right) */
	dx: number;
	/** Y offset in pixels from annotation top */
	dy: number;
}

/**
 * Arrow target position (data space coordinates)
 */
export interface ArrowTarget {
	/** X data value (key varies based on LayerCake config) */
	[xKey: string]: unknown;
	/** Y data value (key varies based on LayerCake config) */
	/** Percentage offset for ordinal X scales (0-100) */
	dx?: number;
	/** Percentage offset for ordinal Y scales (0-100) */
	dy?: number;
}

/**
 * Arrow definition
 */
export interface Arrow {
	/** Which side of annotation: 'west' or 'east' */
	side: 'west' | 'east';
	/** Arc direction: true=clockwise, false=counter-clockwise, null=straight line */
	clockwise: boolean | null;
	/** Source position (pixel offsets from annotation) */
	source: ArrowSource;
	/** Target position (data coordinates) */
	target: ArrowTarget;
}

/**
 * Annotation definition
 */
export interface Annotation {
	/** Unique identifier */
	id: number;
	/** X data value (key varies based on LayerCake config, e.g., 'date' or 'x') */
	[xKey: string]: unknown;
	/** Y data value (key varies based on LayerCake config, e.g., 'value' or 'y') */
	/** Percentage offset from data point in X direction */
	dx: number;
	/** Percentage offset from data point in Y direction */
	dy: number;
	/** Annotation text content */
	text: string;
	/** Width of annotation box (e.g., "150px") */
	width?: string;
	/** Text alignment: 'left', 'center', or 'right' */
	align?: 'left' | 'center' | 'right';
	/** Arrows attached to this annotation */
	arrows: Arrow[];
}

/**
 * Hovering state for interactions
 */
export interface HoverState {
	/** ID of the annotation being hovered */
	annotationId: number;
	/** What is being hovered: 'body' for annotation text, 'arrow' for arrow handles */
	type: 'body' | 'arrow';
	/** For arrow hovers: which side ('west' or 'east') */
	side?: 'west' | 'east';
	/** For arrow hovers: which handle ('source', 'target', or 'create') */
	handle?: 'source' | 'target' | 'create';
}

/**
 * Drag state for live arrow preview during dragging
 */
export interface DragState {
	/** ID of the annotation being edited */
	annotationId: number;
	/** Which arrow side is being dragged */
	side: 'west' | 'east';
	/** Current source X position in pixels */
	sourceX: number;
	/** Current source Y position in pixels */
	sourceY: number;
	/** Current target X position in pixels */
	targetX: number;
	/** Current target Y position in pixels */
	targetY: number;
	/** Arc direction */
	clockwise: boolean | null;
}

/**
 * LayerCake scales object passed to coordinate utilities
 */
export interface LayerCakeScales {
	/** X scale function (data -> pixels) */
	xScale: (value: unknown) => number;
	/** Y scale function (data -> pixels) */
	yScale: (value: unknown) => number;
	/** X accessor function */
	x: (d: unknown) => unknown;
	/** Y accessor function */
	y: (d: unknown) => unknown;
	/** Chart width in pixels */
	width: number;
	/** Chart height in pixels */
	height: number;
}

/**
 * Annotation box position and dimensions
 */
export interface AnnotationBox {
	/** Left edge position in pixels */
	left: number;
	/** Top edge position in pixels */
	top: number;
	/** Width in pixels */
	width: number;
}

/**
 * Point coordinates
 */
export interface Point {
	x: number;
	y: number;
}

/**
 * Reactive reference wrapper (from createRef)
 */
export interface Ref<T> {
	value: T;
}

/**
 * Function to modify annotation properties
 */
export type ModifyAnnotationFn = (id: number, newProps: Partial<Annotation>) => void;

/**
 * Function to create or update an arrow
 */
export type SetArrowFn = (id: number, arrow: Arrow) => void;

/**
 * Function to modify arrow properties
 */
export type ModifyArrowFn = (id: number, side: 'west' | 'east', attrs: Partial<Arrow>) => void;

/**
 * Function to save annotation config (provided by parent)
 */
export type SaveAnnotationConfigFn = (annotations: Annotation[]) => void;
