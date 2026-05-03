import type {
	LiquidGlassEdge,
	LiquidGlassEdges,
	LiquidGlassInteriorLens,
	LiquidGlassMapOptions,
	LiquidGlassMaps,
	LiquidGlassRadius,
	LiquidGlassShape,
	LiquidGlassSpecularHighlight,
} from "./types.js";

export type {
	LiquidGlassEdge,
	LiquidGlassEdges,
	LiquidGlassInteriorLens,
	LiquidGlassMapOptions,
	LiquidGlassMaps,
	LiquidGlassRadius,
	LiquidGlassShape,
	LiquidGlassSpecularHighlight,
} from "./types.js";

interface FieldSample {
	distanceInside: number;
	normalX: number;
	normalY: number;
}

interface EdgeMask {
	all: boolean;
	none: boolean;
	top: boolean;
	right: boolean;
	bottom: boolean;
	left: boolean;
}

interface FilledLensOptions {
	interiorLens: LiquidGlassInteriorLens;
	deformationX: number;
	deformationY: number;
}

const neutralChannel = 128;
const maxCacheEntries = 48;
const mapCache = new Map<string, LiquidGlassMaps>();

export const liquidGlassControlRange = {
	min: 0,
	max: 10,
	decimals: 1,
} as const;

export function normalizeLiquidGlassControl(
	value: number | undefined,
	fallback: number,
): number {
	const safeValue = Number.isFinite(value) ? value : fallback;
	const clampedValue = Math.max(
		liquidGlassControlRange.min,
		Math.min(safeValue ?? fallback, liquidGlassControlRange.max),
	);
	const precision = 10 ** liquidGlassControlRange.decimals;

	return Math.round(clampedValue * precision) / precision;
}

export function createLiquidGlassMaps(
	options: LiquidGlassMapOptions,
): LiquidGlassMaps {
	const width = Math.max(1, Math.round(options.width));
	const height = Math.max(1, Math.round(options.height));
	const dprBucket = getDprBucket(options.dpr);
	const radius = resolveRadius(width, height, options.radius, options.shape);
	const bezelControl = normalizeLiquidGlassControl(options.bezel, 5);
	const scaleControl = normalizeLiquidGlassControl(options.scale, 4);
	const deformationX = normalizeLiquidGlassControl(options.deformationX, 2);
	const deformationY = normalizeLiquidGlassControl(options.deformationY, 1.5);
	const bezel = resolveBezelPixels(width, height, bezelControl);
	const activeEdges = normalizeEdges(options.activeEdges);
	const hasSpecularHighlight = options.specularHighlight;
	const specularHighlight = normalizeSpecularHighlight(options.specularHighlight);
	const requestedScale = resolveRequestedScale(scaleControl);
	const fillRefraction = options.fillRefraction === true;
	const interiorLens = options.interiorLens ?? "linear";
	const { mapWidth, mapHeight } = resolveMapSize(width, height, dprBucket);

	const cacheKey = createLiquidGlassMapCacheKey({
		width,
		height,
		mapWidth,
		mapHeight,
		shape: options.shape,
		radius,
		bezelControl,
		activeEdges,
		specularHighlight: hasSpecularHighlight,
		scaleControl,
		fillRefraction,
		interiorLens,
		deformationX,
		deformationY,
		dprBucket,
	});

	const cachedMaps = mapCache.get(cacheKey);

	if (cachedMaps) {
		return cachedMaps;
	}

	const displacementX = new Float32Array(mapWidth * mapHeight);
	const displacementY = new Float32Array(mapWidth * mapHeight);
	const specularAlphaField = new Float32Array(mapWidth * mapHeight);

	for (let y = 0; y < mapHeight; y += 1) {
		for (let x = 0; x < mapWidth; x += 1) {
			const cssX = ((x + 0.5) / mapWidth) * width;
			const cssY = ((y + 0.5) / mapHeight) * height;
			const sample =
				options.shape === "circle"
					? sampleCircleField(cssX, cssY, width, height)
					: sampleRoundedRectField(cssX, cssY, width, height, radius);
			const index = y * mapWidth + x;

			if (sample.distanceInside < 0) {
				continue;
			}

			if (fillRefraction) {
				const lens = filledLensOffset(
					cssX,
					cssY,
					width,
					height,
					sample.distanceInside,
					bezel,
					requestedScale,
					{
						interiorLens,
						deformationX,
						deformationY,
					},
				);

				if (edgeMaskAllows(activeEdges, lens.normalX, lens.normalY)) {
					displacementX[index] += lens.x;
					displacementY[index] += lens.y;
				}
			} else if (sample.distanceInside <= bezel) {
				const edgeProgress = sample.distanceInside / bezel;
				const magnitude = bevelMagnitude(edgeProgress);

				if (
					magnitude > 0 &&
					edgeMaskAllows(activeEdges, sample.normalX, sample.normalY)
				) {
					displacementX[index] +=
						sample.normalX * magnitude * (requestedScale / 2);
					displacementY[index] +=
						sample.normalY * magnitude * (requestedScale / 2);
				}
			}

			if (
				sample.distanceInside <= bezel &&
				edgeMaskAllows(specularHighlight, sample.normalX, sample.normalY)
			) {
				const edgeProgress = sample.distanceInside / bezel;

				specularAlphaField[index] = specularRimAlpha(edgeProgress);
			}
		}
	}

	const blurredDisplacementX = blurField(displacementX, mapWidth, mapHeight);
	const blurredDisplacementY = blurField(displacementY, mapWidth, mapHeight);
	const blurredSpecularAlpha = blurField(specularAlphaField, mapWidth, mapHeight);
	const displacementScale = resolveDisplacementScale(
		blurredDisplacementX,
		blurredDisplacementY,
		resolveMaxDisplacementScale(width, height, interiorLens),
	);
	const maps = encodeMaps(
		blurredDisplacementX,
		blurredDisplacementY,
		blurredSpecularAlpha,
		mapWidth,
		mapHeight,
		radius,
		bezel,
		dprBucket,
		displacementScale,
	);

	mapCache.set(cacheKey, maps);

	if (mapCache.size > maxCacheEntries) {
		const firstKey = mapCache.keys().next().value;

		if (firstKey) {
			mapCache.delete(firstKey);
		}
	}

	return maps;
}

export interface LiquidGlassMapCacheKeyOptions {
	width: number;
	height: number;
	mapWidth: number;
	mapHeight: number;
	shape: LiquidGlassShape;
	radius: number;
	bezelControl: number;
	activeEdges: EdgeMask;
	specularHighlight: LiquidGlassSpecularHighlight;
	scaleControl: number;
	fillRefraction: boolean;
	interiorLens: LiquidGlassInteriorLens;
	deformationX: number;
	deformationY: number;
	dprBucket: number;
}

export function createLiquidGlassMapCacheKey(
	options: LiquidGlassMapCacheKeyOptions,
): string {
	return [
		options.width,
		options.height,
		options.mapWidth,
		options.mapHeight,
		options.shape,
		Math.round(options.radius * 10) / 10,
		options.bezelControl,
		edgeMaskKey(options.activeEdges),
		String(options.specularHighlight),
		options.scaleControl,
		options.fillRefraction ? "filled" : "bezel",
		options.interiorLens,
		options.deformationX,
		options.deformationY,
		options.dprBucket,
	].join(":");
}

export function getDprBucket(dpr: number): number {
	if (dpr >= 2) {
		return 2;
	}

	if (dpr >= 1.5) {
		return 1.5;
	}

	return 1;
}

function resolveMapSize(
	width: number,
	height: number,
	dprBucket: number,
): { mapWidth: number; mapHeight: number } {
	const maxWidth = 1536;
	const maxHeight = 192;
	const maxPixels = 140_000;
	const minWidth = 96;
	const minHeight = 32;

	let mapWidth = Math.max(minWidth, Math.round(width * dprBucket));
	let mapHeight = Math.max(minHeight, Math.round(height * dprBucket));
	let scale = Math.min(1, maxWidth / mapWidth, maxHeight / mapHeight);

	if (mapWidth * mapHeight * scale * scale > maxPixels) {
		scale = Math.min(scale, Math.sqrt(maxPixels / (mapWidth * mapHeight)));
	}

	mapWidth = Math.max(minWidth, Math.round(mapWidth * scale));
	mapHeight = Math.max(minHeight, Math.round(mapHeight * scale));

	return { mapWidth, mapHeight };
}

function resolveRadius(
	width: number,
	height: number,
	radius: LiquidGlassRadius,
	shape: LiquidGlassShape,
): number {
	const maxRadius = Math.min(width, height) / 2;

	if (shape === "circle" || radius === "capsule") {
		return maxRadius;
	}

	return maxRadius * (normalizeLiquidGlassControl(radius, 10) / 10);
}

function resolveBezelPixels(
	width: number,
	height: number,
	bezelControl: number,
): number {
	const minDimension = Math.min(width, height);
	const maxBezel = Math.min(minDimension / 2, Math.max(2, minDimension * 0.38));

	return 1 + (maxBezel - 1) * (bezelControl / 10);
}

function resolveRequestedScale(scaleControl: number): number {
	return 20 + scaleControl * 6;
}

function sampleCircleField(
	x: number,
	y: number,
	width: number,
	height: number,
): FieldSample {
	const radius = Math.min(width, height) / 2;
	const dx = x - width / 2;
	const dy = y - height / 2;
	const distanceFromCenter = Math.hypot(dx, dy);
	const safeDistance = distanceFromCenter || 1;

	return {
		distanceInside: radius - distanceFromCenter,
		normalX: dx / safeDistance,
		normalY: dy / safeDistance,
	};
}

function sampleRoundedRectField(
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
): FieldSample {
	const dx = x - width / 2;
	const dy = y - height / 2;
	const signX = dx < 0 ? -1 : 1;
	const signY = dy < 0 ? -1 : 1;
	const qx = Math.abs(dx) - (width / 2 - radius);
	const qy = Math.abs(dy) - (height / 2 - radius);
	const outsideX = Math.max(qx, 0);
	const outsideY = Math.max(qy, 0);
	const outsideDistance = Math.hypot(outsideX, outsideY);
	const insideDistance = Math.min(Math.max(qx, qy), 0);
	const signedDistance = outsideDistance + insideDistance - radius;
	const normal = roundedRectNormal(qx, qy, signX, signY);

	return {
		distanceInside: -signedDistance,
		normalX: normal.x,
		normalY: normal.y,
	};
}

function roundedRectNormal(
	qx: number,
	qy: number,
	signX: number,
	signY: number,
): { x: number; y: number } {
	if (qx > 0 && qy > 0) {
		const length = Math.hypot(qx, qy) || 1;

		return {
			x: (signX * qx) / length,
			y: (signY * qy) / length,
		};
	}

	if (qx > qy) {
		return { x: signX, y: 0 };
	}

	return { x: 0, y: signY };
}

function bevelMagnitude(progress: number): number {
	const t = Math.max(0, Math.min(progress, 1));
	const edgeStart = 0.12 * (1 - smootherstep(0.88, 1, t));
	const squircleArc = 1 - Math.abs(2 * t - 1) ** 4;
	const curvedBezel =
		smootherstep(0, 0.12, t) *
		squircleArc *
		(1 - smootherstep(0.82, 1, t)) *
		0.9;

	return Math.min(1, edgeStart + curvedBezel);
}

function filledLensOffset(
	x: number,
	y: number,
	width: number,
	height: number,
	distanceInside: number,
	bezel: number,
	requestedScale: number,
	options: FilledLensOptions,
): { x: number; y: number; normalX: number; normalY: number } {
	const centeredX = (x - width / 2) / Math.max(width / 2, 1);
	const centeredY = (y - height / 2) / Math.max(height / 2, 1);
	const radialDistance = Math.hypot(centeredX, centeredY);
	const safeDistance = radialDistance || 1;
	const edgeRelease = smootherstep(0, Math.max(1, bezel), distanceInside);
	const centerRelax = 1 - 0.1 * smootherstep(0.88, 1, Math.min(radialDistance, 1));
	const strength = edgeRelease * centerRelax;
	const interiorBlend =
		options.interiorLens === "fisheye"
			? smootherstep(bezel, Math.max(bezel * 2.4, bezel + 1), distanceInside)
			: 0;
	const lensX = fisheyeAxis(
		centeredX,
		resolveFisheyeStrength(options.deformationX),
		interiorBlend,
	);
	const lensY = fisheyeAxis(
		centeredY,
		resolveFisheyeStrength(options.deformationY),
		interiorBlend,
	);

	return {
		x: -lensX * requestedScale * 0.34 * strength,
		y: -lensY * requestedScale * 0.36 * strength,
		normalX: centeredX / safeDistance,
		normalY: centeredY / safeDistance,
	};
}

function resolveMaxDisplacementScale(
	_width: number,
	_height: number,
	_interiorLens: LiquidGlassInteriorLens,
): number {
	return 80;
}

function resolveFisheyeStrength(deformation: number): number {
	return 1 + (deformation / 10) * 3.2;
}

function fisheyeAxis(value: number, strength: number, blend: number): number {
	if (blend <= 0 || strength <= 1) {
		return value;
	}

	const sign = value < 0 ? -1 : 1;
	const absoluteValue = Math.abs(value);
	const curveGain = 1 + (strength - 1) * absoluteValue * absoluteValue;
	const curvedValue = sign * absoluteValue * curveGain;
	const clampedValue = clampNumber(curvedValue, -1.8, 1.8);

	return value + (clampedValue - value) * blend;
}

function specularRimAlpha(progress: number): number {
	const t = Math.max(0, Math.min(progress, 1));
	const rimBand =
		smootherstep(0, 0.16, t) *
		(1 - smootherstep(0.74, 1, t));
	const glassLip = 0.18 + 0.82 * (1 - smootherstep(0.46, 1, t));

	return Math.min(0.78, rimBand * glassLip);
}

function blurField(
	field: Float32Array,
	width: number,
	height: number,
): Float32Array {
	const output = new Float32Array(field.length);

	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			let total = 0;
			let weight = 0;

			for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
				const sampleY = clampInteger(y + offsetY, 0, height - 1);
				const weightY = offsetY === 0 ? 2 : 1;

				for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
					const sampleX = clampInteger(x + offsetX, 0, width - 1);
					const sampleWeight = weightY * (offsetX === 0 ? 2 : 1);

					total += field[sampleY * width + sampleX] * sampleWeight;
					weight += sampleWeight;
				}
			}

			output[y * width + x] = total / weight;
		}
	}

	return output;
}

function resolveDisplacementScale(
	displacementX: Float32Array,
	displacementY: Float32Array,
	maxScale: number,
): number {
	let maxOffset = 0;

	for (let index = 0; index < displacementX.length; index += 1) {
		maxOffset = Math.max(
			maxOffset,
			Math.abs(displacementX[index]),
			Math.abs(displacementY[index]),
		);
	}

	return Math.max(20, Math.min(Math.ceil(maxOffset * 2), maxScale));
}

function encodeMaps(
	displacementX: Float32Array,
	displacementY: Float32Array,
	specularAlphaField: Float32Array,
	width: number,
	height: number,
	radius: number,
	bezel: number,
	dprBucket: number,
	displacementScale: number,
): LiquidGlassMaps {
	const canvas = document.createElement("canvas");

	canvas.width = width;
	canvas.height = height;

	const context = canvas.getContext("2d");

	if (!context) {
		throw new Error("Could not create liquid glass canvas context.");
	}

	const displacementData = context.createImageData(width, height);

	for (let index = 0; index < displacementX.length; index += 1) {
		const pixelIndex = index * 4;

		displacementData.data[pixelIndex] = encodeChannel(
			displacementX[index],
			displacementScale,
		);
		displacementData.data[pixelIndex + 1] = encodeChannel(
			displacementY[index],
			displacementScale,
		);
		displacementData.data[pixelIndex + 2] = neutralChannel;
		displacementData.data[pixelIndex + 3] = 255;
	}

	context.putImageData(displacementData, 0, 0);

	const displacementMap = canvas.toDataURL("image/png");
	const specularData = context.createImageData(width, height);

	for (let index = 0; index < specularAlphaField.length; index += 1) {
		const pixelIndex = index * 4;
		const alpha = Math.round(
			Math.max(0, Math.min(specularAlphaField[index], 1)) * 255,
		);

		specularData.data[pixelIndex] = 255;
		specularData.data[pixelIndex + 1] = 255;
		specularData.data[pixelIndex + 2] = 255;
		specularData.data[pixelIndex + 3] = alpha;
	}

	context.putImageData(specularData, 0, 0);

	return {
		displacementMap,
		specularMap: canvas.toDataURL("image/png"),
		mapWidth: width,
		mapHeight: height,
		radius,
		bezel,
		dprBucket,
		displacementScale,
	};
}

function encodeChannel(value: number, displacementScale: number): number {
	return Math.max(
		0,
		Math.min(255, Math.round(255 * (0.5 + value / displacementScale))),
	);
}

function smootherstep(edge0: number, edge1: number, value: number): number {
	if (edge0 === edge1) {
		return value < edge0 ? 0 : 1;
	}

	const x = Math.max(0, Math.min((value - edge0) / (edge1 - edge0), 1));

	return x * x * x * (x * (x * 6 - 15) + 10);
}

function clampInteger(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(value, max));
}

function clampNumber(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(value, max));
}

function normalizeEdges(edges: LiquidGlassEdges): EdgeMask {
	if (edges === "all") {
		return {
			all: true,
			none: false,
			top: true,
			right: true,
			bottom: true,
			left: true,
		};
	}

	if (edges === "none") {
		return {
			all: false,
			none: true,
			top: false,
			right: false,
			bottom: false,
			left: false,
		};
	}

	const selectedEdges = Array.isArray(edges) ? edges : [edges];

	return {
		all: false,
		none: false,
		top: selectedEdges.includes("top"),
		right: selectedEdges.includes("right"),
		bottom: selectedEdges.includes("bottom"),
		left: selectedEdges.includes("left"),
	};
}

function normalizeSpecularHighlight(
	specularHighlight: LiquidGlassSpecularHighlight,
): EdgeMask {
	return normalizeEdges(specularHighlight ? "all" : "none");
}

function edgeMaskAllows(edges: EdgeMask, normalX: number, normalY: number): boolean {
	const threshold = 0.035;

	if (edges.all) {
		return true;
	}

	if (edges.none) {
		return false;
	}

	return (
		(normalY < -threshold && edges.top) ||
		(normalX > threshold && edges.right) ||
		(normalY > threshold && edges.bottom) ||
		(normalX < -threshold && edges.left)
	);
}

function edgeMaskKey(edges: EdgeMask): string {
	if (edges.all) {
		return "all";
	}

	if (edges.none) {
		return "none";
	}

	return [
		edges.top ? "top" : "",
		edges.right ? "right" : "",
		edges.bottom ? "bottom" : "",
		edges.left ? "left" : "",
	]
		.filter(Boolean)
		.join(",");
}
