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
		]
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

		const element = active.parentElement;
		const direction = [...active.classList].filter((c) => c !== 'grabber' && c !== 'selected')[0];
		let delta;

		if (direction.match('east')) {
			delta = event.pageX - initialPos.x;
			element.style.width = `${initialRect.width + delta}px`;
		}

		if (direction.match('west')) {
			delta = initialPos.x - event.pageX;
			element.style.left = `${initialRect.left - delta}px`;
			element.style.width = `${initialRect.width + delta}px`;
		}

		if (direction.match('north')) {
			delta = initialPos.y - event.pageY;
			element.style.top = `${initialRect.top - delta}px`;
			element.style.height = `${initialRect.height + delta}px`;
		}

		if (direction.match('south')) {
			delta = event.pageY - initialPos.y;
			element.style.height = `${initialRect.height + delta}px`;
		}
	}
</script>

{#each grabbers as grabber}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="grabber {grabber}" class:debug={!debug} {onmousedown}></div>
{/each}

<style>
	.grabber {
		position: absolute;
		box-sizing: border-box;
	}

	.grabber.east {
		width: 10px;
		height: 100%;
		background: red;
		right: -5px;
		cursor: col-resize;
		top: 0;
	}

	.grabber.west {
		width: 10px;
		height: 100%;
		background: blue;
		left: -5px;
		cursor: col-resize;
		top: 0;
	}

	.grabber.north {
		height: 10px;
		width: 100%;
		background: green;
		top: -5px;
		cursor: row-resize;
	}

	.grabber.south {
		height: 10px;
		width: 100%;
		background: orange;
		bottom: -5px;
		cursor: row-resize;
	}

	.grabber.northwest {
		height: 20px;
		width: 20px;
		background: orange;
		top: -10px;
		left: -10px;
		cursor: nw-resize;
		border-radius: 100%;
	}

	.grabber.northeast {
		height: 20px;
		width: 20px;
		background: orange;
		top: -10px;
		right: -10px;
		cursor: ne-resize;
		border-radius: 100%;
	}

	.grabber.southwest {
		height: 20px;
		width: 20px;
		background: green;
		bottom: -10px;
		left: -10px;
		cursor: sw-resize;
		border-radius: 100%;
	}

	.grabber.southeast {
		height: 20px;
		width: 20px;
		background: green;
		bottom: -10px;
		right: -10px;
		cursor: se-resize;
		border-radius: 100%;
	}

	.grabber.debug {
		background: transparent !important;
		border: none !important;
	}

	.grabber.selected {
		border: solid 1px black;
	}
</style>
