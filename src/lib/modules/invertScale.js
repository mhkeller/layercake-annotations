import ordinalInvert from './ordinalInvert.js';

export default function invertScale(scale, pos) {
	return scale.invert ? [scale.invert(pos), 0] : ordinalInvert(scale, pos);
}
