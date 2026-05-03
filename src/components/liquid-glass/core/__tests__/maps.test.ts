import { describe, expect, it } from "vitest";

import {
	createLiquidGlassMaps,
	createLiquidGlassMapCacheKey,
	getDprBucket,
	normalizeLiquidGlassControl,
} from "../maps.js";
import type { LiquidGlassMapOptions } from "../types.js";

const allEdges = {
	all: true,
	none: false,
	top: true,
	right: true,
	bottom: true,
	left: true,
};

interface CapturedImageData {
	width: number;
	height: number;
	data: Uint8ClampedArray;
}

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
			specularHighlight: true,
			scaleControl: 4.3,
			fillRefraction: true,
			interiorLens: "fisheye",
			deformationX: 3,
			deformationY: 2,
			dprBucket: 2,
		});

		expect(cacheKey).toBe(
			"320:72:640:144:rounded-rect:36:1:all:true:4.3:filled:fisheye:3:2:2",
		);
	});

	it("generates an angle-independent alpha mask for the specular rim", () => {
		const specular = captureSpecularMask({
			width: 118,
			height: 54,
			shape: "rounded-rect",
			radius: "capsule",
			bezel: 5,
			activeEdges: "all",
			specularHighlight: true,
			dpr: 1,
			scale: 4,
			fillRefraction: true,
			interiorLens: "linear",
		});

		expect(maxAlpha(specular)).toBeGreaterThan(120);
		expect(alphaAt(specular, 0, 0)).toBe(0);
		expect(alphaAt(specular, specular.width / 2, specular.height / 2)).toBe(0);
	});

	it("emits a transparent specular mask when highlights are disabled", () => {
		const specular = captureSpecularMask({
			width: 134,
			height: 62,
			shape: "rounded-rect",
			radius: "capsule",
			bezel: 5,
			activeEdges: "all",
			specularHighlight: false,
			dpr: 1,
			scale: 4,
			fillRefraction: true,
			interiorLens: "linear",
		});

		expect(maxAlpha(specular)).toBe(0);
	});
});

function captureSpecularMask(options: LiquidGlassMapOptions): CapturedImageData {
	const captures: CapturedImageData[] = [];
	const originalGetContext = HTMLCanvasElement.prototype.getContext;
	const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

	HTMLCanvasElement.prototype.getContext = function getContext(contextId: string) {
		if (contextId !== "2d") {
			return null;
		}

		return {
			createImageData: (width: number, height: number) =>
				({
					width,
					height,
					data: new Uint8ClampedArray(width * height * 4),
					colorSpace: "srgb",
				}) as ImageData,
			putImageData: (imageData: ImageData) => {
				captures.push({
					width: imageData.width,
					height: imageData.height,
					data: new Uint8ClampedArray(imageData.data),
				});
			},
		} as unknown as CanvasRenderingContext2D;
	} as typeof HTMLCanvasElement.prototype.getContext;

	HTMLCanvasElement.prototype.toDataURL = function toDataURL() {
		return `data:image/png;base64,test-${captures.length}`;
	};

	try {
		createLiquidGlassMaps(options);
	} finally {
		HTMLCanvasElement.prototype.getContext = originalGetContext;
		HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
	}

	const specular = captures[1];

	if (!specular) {
		throw new Error("Expected liquid glass specular mask data.");
	}

	return specular;
}

function alphaAt(image: CapturedImageData, x: number, y: number): number {
	const clampedX = Math.max(0, Math.min(Math.floor(x), image.width - 1));
	const clampedY = Math.max(0, Math.min(Math.floor(y), image.height - 1));

	return image.data[(clampedY * image.width + clampedX) * 4 + 3] ?? 0;
}

function maxAlpha(
	image: CapturedImageData,
	predicate: (x: number, y: number) => boolean = () => true,
): number {
	let max = 0;

	for (let y = 0; y < image.height; y += 1) {
		for (let x = 0; x < image.width; x += 1) {
			if (predicate(x, y)) {
				max = Math.max(max, alphaAt(image, x, y));
			}
		}
	}

	return max;
}
