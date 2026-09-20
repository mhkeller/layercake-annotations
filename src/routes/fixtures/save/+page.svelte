<!--
	A test fixture for tests/save.test.js. It mounts a chart the way a host app
	would, with `mount` and a context, and keeps a record of every save.

	The query string picks the case:
	  hook=onsave | context | both | none   who is given a save function
	  scale=linear | time                   the chart's x scale
-->
<script>
	import { mount, unmount } from 'svelte';

	import Chart from './Chart.svelte';

	/** 'array' for an array, and what `typeof` says for the rest. */
	function kind(value) {
		return Array.isArray(value) ? 'array' : typeof value;
	}

	function clones(value) {
		try {
			structuredClone(value);
			return true;
		} catch {
			return false;
		}
	}

	/** The same data all the way down. Two dates match when they are the same moment. */
	function sameData(a, b) {
		if (a instanceof Date || b instanceof Date) {
			return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
		}
		if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b;
		if (Array.isArray(a) !== Array.isArray(b)) return false;

		const keys = Object.keys(a);
		return (
			keys.length === Object.keys(b).length &&
			keys.every((key) => key in b && sameData(a[key], b[key]))
		);
	}

	/**
	 * Write down one save, from inside the function that was called. What is kept
	 * is plain facts, because the arguments themselves change on the way to a test:
	 * a test gets a copy, and a copy can't say what the original was.
	 *
	 * The text and the annotations are found by what they are, not by where they
	 * come. `kinds` alone holds the order.
	 * @param {'onsave' | 'context'} who
	 * @param {unknown[]} args
	 */
	function record(who, args) {
		const text = args.find((arg) => typeof arg === 'string');
		const annotations = args.find(Array.isArray);
		const canClone = annotations !== undefined && clones(annotations);

		/** @type {any} */ (window).__saves.push({
			who,
			// Milliseconds since the page opened, on the page's own clock.
			at: performance.now(),
			kinds: args.map(kind),
			text,
			annotations: canClone ? structuredClone(annotations) : null,
			clones: canClone,
			dateIsDate: annotations?.[0]?.data.date instanceof Date,
			textRunsToAnnotations:
				text !== undefined &&
				annotations !== undefined &&
				sameData(new Function(`return ${text}`)(), annotations)
		});
	}

	/** @param {unknown[]} args */
	const onsave = (...args) => record('onsave', args);

	/** @param {unknown[]} args */
	const fromContext = (...args) => record('context', args);

	/**
	 * Mount the chart into an element. The query string is read here, in the
	 * browser, because the page is prerendered and a prerender has none.
	 * @param {HTMLElement} target
	 */
	function host(target) {
		const query = new URLSearchParams(location.search);
		const hook = query.get('hook') ?? 'none';

		/** @type {any} */ (window).__saves = [];

		const chart = mount(Chart, {
			target,
			props: {
				scale: query.get('scale') === 'time' ? 'time' : 'linear',
				onsave: ['onsave', 'both'].includes(hook) ? onsave : undefined
			},
			context: new Map(
				['context', 'both'].includes(hook) ? [['saveAnnotationConfig', fromContext]] : []
			)
		});

		return () => unmount(chart);
	}
</script>

<svelte:head>
	<title>Save fixture</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div {@attach host}></div>
