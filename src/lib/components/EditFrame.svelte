<!--
  @component
  Outlines the chart's plotting area, the part where a click adds an annotation. A tab in its top-right corner holds a switch for editing and a button that copies the config.
 -->
<script>
	/** @typedef {import('../types.js').Annotation} Annotation */

	import { Html } from 'layercake';

	import serializeAnnotations from '../modules/serializeAnnotations.js';

	/** @type {{ editable?: boolean, annotations?: Annotation[] }} */
	let { editable = $bindable(true), annotations = [] } = $props();

	/**
	 * What a press of Copy can end in: what the button says, and what a screen
	 * reader hears.
	 * @type {Record<'copied' | 'logged', { label: string, status: string, title?: string }>}
	 */
	const OUTCOMES = {
		copied: { label: 'Copied', status: 'Config copied to the clipboard' },
		logged: {
			label: 'See console',
			status: 'Config logged to the browser console',
			title:
				"The browser blocked the clipboard, so the config went to the browser console. A page not served over https or from localhost can't copy at all."
		}
	};

	/**
	 * The last press of Copy: the text it copied, and how it ended. Null until the
	 * first press.
	 * @type {{ text: string, outcome: keyof typeof OUTCOMES } | null}
	 */
	let last = $state.raw(null);

	// The button reports the last press while the config is still what it copied,
	// so the next edit sets it back to Copy. Nothing is compared until a press.
	let outcome = $derived(
		last !== null && last.text === serializeAnnotations($state.snapshot(annotations))
			? OUTCOMES[last.outcome]
			: null
	);

	async function copy() {
		// Read before anything waits, so the text is the config at the press.
		const text = serializeAnnotations($state.snapshot(annotations));

		try {
			await navigator.clipboard.writeText(text);
			last = { text, outcome: 'copied' };
		} catch {
			// A page that isn't a secure context, like a dev server opened on a LAN
			// address, has no clipboard, and a browser can refuse the write. The
			// console always takes it.
			console.log('Annotations config:', text);
			last = { text, outcome: 'logged' };
		}
	}
</script>

<Html pointerEvents={false}>
	<div class="layercake-annotations-frame" class:editable>
		<div class="layercake-annotations-tab">
			<label>
				<span class="box">
					<input type="checkbox" bind:checked={editable} />
					<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" /></svg>
				</span>
				Editable
			</label>
			<button type="button" onclick={copy} title={outcome?.title}>
				{outcome?.label ?? 'Copy'}
			</button>
			<span class="visually-hidden" role="status">{outcome?.status ?? ''}</span>
		</div>
	</div>
</Html>

<style>
	/* The frame and its tab share a color, faint until the chart is editable. */
	.layercake-annotations-frame {
		--frame: var(--layercake-annotations-frame-color, #e2dbcc);
		--frame-ink: var(--layercake-annotations-frame-ink, #141414);
		position: absolute;
		/* The border sits just outside the plotting area, so it covers none of the chart. */
		inset: -4px;
		border: 4px solid var(--frame);
	}
	.layercake-annotations-frame.editable {
		--frame: var(--layercake-annotations-frame-color-editable, #f4b400);
	}

	/* Above the notes, so the switch can always be reached. A note placed in this
	   corner goes partly under the tab. */
	.layercake-annotations-tab {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 4px 10px 5px;
		background: var(--frame);
		color: var(--frame-ink);
		font-family: var(--layercake-annotations-frame-font, system-ui, sans-serif);
		font-size: 12px;
		line-height: 18px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		user-select: none;
		pointer-events: auto;
	}

	label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}

	/* The checkmark is drawn over the box rather than as its background, so it
	   takes the frame's color. */
	.box {
		display: grid;
	}
	.box > * {
		grid-area: 1 / 1;
	}
	input {
		appearance: none;
		margin: 0;
		width: 14px;
		height: 14px;
		border: 2px solid var(--frame-ink);
		background: transparent;
		cursor: pointer;
	}
	input:checked {
		background: var(--frame-ink);
	}
	svg {
		width: 12px;
		height: 12px;
		place-self: center;
		fill: none;
		stroke: var(--frame);
		stroke-width: 3;
		pointer-events: none;
		visibility: hidden;
	}
	input:checked + svg {
		visibility: visible;
	}

	button {
		margin: 0;
		padding: 0 5px;
		border: 2px solid var(--frame-ink);
		border-radius: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		line-height: 14px;
		letter-spacing: inherit;
		text-transform: inherit;
		cursor: pointer;
	}
	button:hover {
		background: var(--frame-ink);
		color: var(--frame);
	}

	input:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--layercake-annotations-frame-focus, #1f4e9c);
		outline-offset: 2px;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	/* Forced colors drop the drawn checkbox's fill, so hand the switch back to the browser. */
	@media (forced-colors: active) {
		input {
			appearance: auto;
		}
		svg {
			display: none;
		}
	}
</style>
