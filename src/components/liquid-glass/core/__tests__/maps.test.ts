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
			scaleControl: 4.3,
			fillRefraction: true,
			interiorLens: "fisheye",
			deformationX: 3,
			deformationY: 2,
			dprBucket: 2,
		});

		expect(cacheKey).toBe(
			"320:72:640:144:rounded-rect:36:1:all:4.3:filled:fisheye:3:2:2",
		);
	});

	it.each([true, false])("samples inward with fillRefraction=%s", (fillRefraction) => {
		const { image, maps } = captureDisplacementMap({
			width: 118, height: 54, shape: "rounded-rect", radius: "capsule",
			bezel: 5, activeEdges: "all", dpr: 1, scale: 4, fillRefraction,
		});
		expect(maps).not.toHaveProperty("specularMap");
		expect(channelAt(image, 10, 27, 0)).toBeGreaterThan(128);
		expect(channelAt(image, 107, 27, 0)).toBeLessThan(128);
		expect(channelAt(image, 59, 7, 1)).toBeGreaterThan(128);
		expect(channelAt(image, 59, 46, 1)).toBeLessThan(128);
	});

	it.each([true, false])("keeps the clip boundary neutral after smoothing with fillRefraction=%s", (fillRefraction) => {
		const { image } = captureDisplacementMap({
			width: 120, height: 60, shape: "rounded-rect", radius: 0,
			bezel: 5, activeEdges: "all", dpr: 1, scale: 4, fillRefraction,
		});
		for (let x = 0; x < image.width; x += 1) {
			expect(channelAt(image, x, 0, 1)).toBe(128);
			expect(channelAt(image, x, image.height - 1, 1)).toBe(128);
		}
		for (let y = 0; y < image.height; y += 1) {
			expect(channelAt(image, 0, y, 0)).toBe(128);
			expect(channelAt(image, image.width - 1, y, 0)).toBe(128);
		}
	});

	it("starts filled refraction immediately inside the clip boundary", () => {
		const { image } = captureDisplacementMap({
			width: 120, height: 60, shape: "rounded-rect", radius: 0,
			bezel: 0.5, activeEdges: "all", dpr: 1, scale: 4, fillRefraction: true,
		});
		expect(channelAt(image, 60, 0, 1)).toBe(128);
		expect(channelAt(image, 60, 1, 1)).toBeGreaterThan(128);
	});

	it.each([[1200, 300], [300, 1200], [8, 1000], [1000, 8]])("bounds raster work and preserves aspect ratio for %s x %s", (width, height) => {
		const { maps } = captureDisplacementMap({
			width, height, shape: "rounded-rect", radius: 2,
			bezel: 3, activeEdges: "all", dpr: 2, scale: 2,
		});
		expect(maps.mapWidth * maps.mapHeight).toBeLessThanOrEqual(140_000);
		expect(Math.max(maps.mapWidth, maps.mapHeight)).toBeLessThanOrEqual(1536);
		expect(Math.abs(maps.mapWidth / width - maps.mapHeight / height)).toBeLessThanOrEqual(1 / Math.min(width, height));
	});

	it.each([
		[448, 256, 0, 0],
		[448, 256, 1.2, 15.36],
		[256, 448, 1.2, 15.36],
		[448, 256, 10, 128],
	] as const)("resolves %s x %s radius %s from the shortest side", (width, height, radius, expected) => {
		const { maps } = captureDisplacementMap({
			width, height, radius, shape: "rounded-rect", bezel: 1,
			activeEdges: "all", dpr: 1, scale: 2, fillRefraction: true,
		});
		expect(maps.radius).toBeCloseTo(expected);
	});

});

function captureDisplacementMap(options: LiquidGlassMapOptions) {
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
		const maps = createLiquidGlassMaps(options);
		expect(captures).toHaveLength(1);
		const image = captures[0];
		if (!image) throw new Error("Expected displacement image data.");
		return { image, maps };
	} finally {
		HTMLCanvasElement.prototype.getContext = originalGetContext;
		HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
	}

}

function channelAt(image: CapturedImageData, x: number, y: number, channel: number): number {
	return image.data[(y * image.width + x) * 4 + channel] ?? 0;
}
