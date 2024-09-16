<script>
	// https://svelte.dev/repl/8b974ea483c648fba362a1e9f3dbc29f?version=4.2.18
	let {
		debug = true,
		grabbers = [
			'north',
			'south',
			'east',
			'west',
			'southwest',
			'southeast',
			'northwest',
			'northeast'
		],
		width = $bindable(),
		ondrag
	} = $props();

	let active = $state(null);
	let initialRect = $state(null);
	let initialPos = $state(null);

	function onmousedown(event) {
		event.stopPropagation();
		active = event.target;
		const rect = active.parentElement.getBoundingClientRect();
		initialRect = {
			width: rect.width,
			height: rect.height,
			left: rect.left,
			right: rect.right,
			top: rect.top,
			bottom: rect.bottom
		};
		initialPos = { x: event.pageX, y: event.pageY };
		active.classList.add('selected');

		window.addEventListener('mousemove', onmousemove);
		window.addEventListener('mouseup', onmouseup);
	}

	function onmouseup() {
		if (!active) return;

		active.classList.remove('selected');
		active = null;
		initialRect = null;
		initialPos = null;

		window.removeEventListener('mousemove', onmousemove);
		window.removeEventListener('mouseup', onmouseup);
	}

	function onmousemove(event) {
		if (!active) return;

		const direction = [...active.classList].filter((c) => c !== 'grabber' && c !== 'selected')[0];
		let delta;

		if (direction.match('east')) {
			delta = event.pageX - initialPos.x;
			width = `${initialRect.width + delta}px`;
			ondrag();
		}

		if (direction.match('west')) {
			delta = initialPos.x - event.pageX;
			const left = `${initialRect.left - delta}px`;
			width = `${initialRect.width + delta}px`;
			ondrag([left + width]);
		}

		/**
		 * Refresh the draggable element's position.
		 */
	}
</script>

{#each grabbers as grabber}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="grabber {grabber}" class:debug {onmousedown}></div>
{/each}

<style>
	.grabber {
		position: absolute;
		box-sizing: border-box;
		transition: opacity 250ms;
		opacity: 0;
		z-index: 9999;
		width: 4px;
		height: 75%;
		background: red;
		cursor: col-resize;
		top: 12.5%;
	}
	.grabber.west {
		left: -0.5px;
		transform: translateX(-50%);
	}
	.grabber.east {
		right: -0.5px;
		transform: translateX(50%);
	}

	.grabber.debug.east {
		width: 10px;
		height: 100%;
		background: red;
		right: -5px;
		cursor: col-resize;
		top: 0;
	}

	.grabber.debug.west {
		width: 10px;
		height: 100%;
		background: blue;
		left: -5px;
		cursor: col-resize;
		top: 0;
	}

	.grabber.debug.north {
		height: 10px;
		width: 100%;
		background: green;
		top: -5px;
		cursor: row-resize;
	}

	.grabber.debug.south {
		height: 10px;
		width: 100%;
		background: orange;
		bottom: -5px;
		cursor: row-resize;
	}

	.grabber.debug.northwest {
		height: 20px;
		width: 20px;
		background: orange;
		top: -10px;
		left: -10px;
		cursor: nw-resize;
		border-radius: 100%;
	}

	.grabber.debug.northeast {
		height: 20px;
		width: 20px;
		background: orange;
		top: -10px;
		right: -10px;
		cursor: ne-resize;
		border-radius: 100%;
	}

	.grabber.debug.southwest {
		height: 20px;
		width: 20px;
		background: green;
		bottom: -10px;
		left: -10px;
		cursor: sw-resize;
		border-radius: 100%;
	}

	.grabber.debug.southeast {
		height: 20px;
		width: 20px;
		background: green;
		bottom: -10px;
		right: -10px;
		cursor: se-resize;
		border-radius: 100%;
	}

	.grabber.selected {
		opacity: 1;
	}
</style>
