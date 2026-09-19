<!--
  @component
  Outlines the chart's plotting area, the part where a click adds an annotation, and puts a switch for editing in its top-right corner.
 -->
<script>
	import { Html } from 'layercake';

	/**
	 * @typedef {Object} Props
	 * @property {boolean} editable - Whether the chart's annotations can be edited. Bindable.
	 */

	/** @type {Props} */
	let { editable = $bindable() } = $props();
</script>

<Html pointerEvents={false}>
	<div class="frame" class:editable>
		<label class="edit-tab">
			<input type="checkbox" bind:checked={editable} />
			Editable
		</label>
	</div>
</Html>

<style>
	/* The frame and its tab share a color, faint until the chart is editable. */
	.frame {
		--frame: #e2dbcc;
		position: absolute;
		/* The border sits just outside the plotting area, so it covers none of the chart. */
		inset: -4px;
		border: 4px solid var(--frame);
	}
	.frame.editable {
		--frame: var(--yellow);
	}

	.edit-tab {
		position: absolute;
		top: 0;
		right: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 10px 5px;
		background: var(--frame);
		font-family: var(--display);
		font-size: 12px;
		line-height: 18px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
		user-select: none;
		pointer-events: auto;
	}
	.edit-tab input {
		appearance: none;
		margin: 0;
		width: 14px;
		height: 14px;
		border: 2px solid var(--ink);
		background: transparent;
		cursor: pointer;
	}
	.edit-tab input:checked {
		background: var(--ink)
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3 8.5l3.2 3L13 4.5' fill='none' stroke='%23f4b400' stroke-width='3'/%3E%3C/svg%3E")
			center / 12px no-repeat;
	}
	.edit-tab input:focus-visible {
		outline: 2px solid var(--blue);
		outline-offset: 2px;
	}
</style>
