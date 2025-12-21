/**
 * swoopyArrow
 *
 * Creates curved SVG arc paths between two points.
 * Adapted from bizweekgraphics/swoopyarrows
 */
export function swoopyArrow() {
	let angle = Math.PI;
	let clockwise = true;
	let xValue = (d) => d[0];
	let yValue = (d) => d[1];

	function hypotenuse(a, b) {
		return Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
	}

	function render(data) {
		data = data.map((d, i) => {
			return [xValue.call(data, d, i), yValue.call(data, d, i)];
		});

		// get the chord length ("height" {h}) between points
		const h = hypotenuse(data[1][0] - data[0][0], data[1][1] - data[0][1]);

		// get the distance at which chord of height h subtends {angle} radians
		const d = h / (2 * Math.tan(angle / 2));

		// get the radius {r} of the circumscribed circle
		const r = hypotenuse(d, h / 2);

		/*
		SVG arc command:
		M x,y - Move to start point
		a rx,ry rotation large-arc-flag,sweep-flag dx,dy - Draw arc
		*/
		const path =
			'M ' +
			data[0][0] +
			',' +
			data[0][1] +
			' a ' +
			r +
			',' +
			r +
			' 0 0,' +
			(clockwise ? '1' : '0') +
			' ' +
			(data[1][0] - data[0][0]) +
			',' +
			(data[1][1] - data[0][1]);

		return path;
	}

	render.angle = function renderAngle(_) {
		if (!arguments.length) return angle;
		angle = Math.min(Math.max(_, 1e-6), Math.PI - 1e-6);
		return render;
	};

	render.clockwise = function renderClockwise(_) {
		if (!arguments.length) return clockwise;
		clockwise = !!_;
		return render;
	};

	render.x = function renderX(_) {
		if (!arguments.length) return xValue;
		xValue = _;
		return render;
	};

	render.y = function renderY(_) {
		if (!arguments.length) return yValue;
		yValue = _;
		return render;
	};

	return render;
}
