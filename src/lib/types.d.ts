/**
 * Type definitions for layercake-annotations
 */

/**
 * Where an arrow leaves its annotation, in pixels
 */
export interface ArrowSource {
	/** Pixels from the near edge of the annotation (west=left, east=right) */
	dx: number;
	/** Pixels down from the anchor point */
	dy: number;
}

/**
 * Arrow target position (data space coordinates)
 */
export interface ArrowTarget {
	/** User data values (x/y keys match LayerCake config) */
	data: Record<string, unknown>;
	/** Percentage of chart width added to the band's start, for ordinal X scales. Negative ahead of the first band. Default 0. */
	dx?: number;
	/** Percentage of chart height added to the band's start, for ordinal Y scales. Negative ahead of the first band. Default 0. */
	dy?: number;
}

/**
 * Arrow definition
 */
export interface Arrow {
	/** Which side of annotation: 'west' or 'east' */
	side: 'west' | 'east';
	/** Arc direction: true=clockwise, false=counter-clockwise, null=straight line. Default true. */
	clockwise?: boolean | null;
	/** Where the arrow leaves the annotation, in pixels. Default: level with the anchor point, one handle out from the near edge. */
	source?: Partial<ArrowSource>;
	/** Target position (data coordinates) */
	target: ArrowTarget;
}

/**
 * Annotation definition
 */
export interface Annotation {
	/** Unique identifier */
	id: number;
	/** User data values (x/y keys match LayerCake config) */
	data: Record<string, unknown>;
	/** Percentage offset from data point in X direction. Default 0. */
	dx?: number;
	/** Percentage offset from data point in Y direction. Default 0. */
	dy?: number;
	/** Annotation text content */
	text: string;
	/** Width of annotation box (e.g., "150px") */
	width?: string;
	/** Text alignment: 'left', 'center', or 'right' */
	align?: 'left' | 'center' | 'right';
	/** Custom inline CSS styles (e.g., "background: yellow; padding: 8px;") */
	style?: string;
	/** Custom CSS class name(s) to add to the annotation element */
	class?: string;
	/** Anchor X position as percentage (0-100) of annotation width. Default 0 (left edge). */
	anchorX?: number;
	/** Anchor Y position as percentage (0-100) of annotation height. Arrow sources measure down from here. Default 0 (top edge). */
	anchorY?: number;
	/** Arrows attached to this annotation */
	arrows?: Arrow[];
}

/**
 * An arrow with every default filled in, as `resolveArrow` returns it
 */
export interface ResolvedArrow extends Arrow {
	/** Arc direction: true=clockwise, false=counter-clockwise, null=straight line */
	clockwise: boolean | null;
	/** Where the arrow leaves the annotation, in pixels */
	source: ArrowSource;
	/** Target position (data coordinates), with both percentage offsets present */
	target: ArrowTarget & { dx: number; dy: number };
}

/**
 * An annotation with every default filled in, as `resolveAnnotation` returns it.
 * Width is the exception: it stays a CSS string and is parsed where it is used.
 */
export interface ResolvedAnnotation extends Annotation {
	/** Percentage offset from data point in X direction */
	dx: number;
	/** Percentage offset from data point in Y direction */
	dy: number;
	/** Annotation text content */
	text: string;
	/** Text alignment: 'left', 'center', or 'right' */
	align: 'left' | 'center' | 'right';
	/** Anchor X position as percentage (0-100) of annotation width */
	anchorX: number;
	/** Anchor Y position as percentage (0-100) of annotation height */
	anchorY: number;
	/** Arrows attached to this annotation, each with its defaults filled in */
	arrows: ResolvedArrow[];
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
 * Function to save annotation config (the `onsave` prop). It is handed a plain
 * copy of the annotations.
 */
export type SaveAnnotationConfigFn = (annotations: Annotation[]) => void;
