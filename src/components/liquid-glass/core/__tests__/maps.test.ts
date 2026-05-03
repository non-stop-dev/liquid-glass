import { describe, expect, it } from "vitest";

import {
	createLiquidGlassMapCacheKey,
	getDprBucket,
	normalizeLiquidGlassControl,
} from "../maps.js";

const allEdges = {
	all: true,
	none: false,
	top: true,
	right: true,
	bottom: true,
	left: true,
};

const topBottomEdges = {
	all: false,
	none: false,
	top: true,
	right: false,
	bottom: true,
	left: false,
};

describe("liquid glass map controls", () => {
	it("normalizes controls to the 0-10 range with one decimal place", () => {
		expect(normalizeLiquidGlassControl(-1, 4)).toBe(0);
		expect(normalizeLiquidGlassControl(4.46, 4)).toBe(4.5);
		expect(normalizeLiquidGlassControl(10.49, 4)).toBe(10);
		expect(normalizeLiquidGlassControl(Number.NaN, 1.5)).toBe(1.5);
	});

	it("buckets DPR for map cache and generation limits", () => {
		expect(getDprBucket(1)).toBe(1);
		expect(getDprBucket(1.6)).toBe(1.5);
		expect(getDprBucket(2.25)).toBe(2);
	});

	it("includes geometry, optical controls, edge masks, lens mode, deformation, and DPR in the cache key", () => {
		const cacheKey = createLiquidGlassMapCacheKey({
			width: 320,
			height: 72,
			mapWidth: 640,
			mapHeight: 144,
			shape: "rounded-rect",
			radius: 36,
			bezelControl: 1,
			activeEdges: allEdges,
			specularHighlight: topBottomEdges,
			scaleControl: 4.3,
			fillRefraction: true,
			interiorLens: "fisheye",
			deformationX: 3,
			deformationY: 2,
			dprBucket: 2,
		});

		expect(cacheKey).toBe(
			"320:72:640:144:rounded-rect:36:1:all:top,bottom:4.3:filled:fisheye:3:2:2",
		);
	});
});
