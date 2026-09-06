import type { LiquidGlassMaps } from "./types.js";

const neutralChannel = 128;

export function blurField(
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
				const sampleY = Math.max(0, Math.min(y + offsetY, height - 1));
				const weightY = offsetY === 0 ? 2 : 1;

				for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
					const sampleX = Math.max(0, Math.min(x + offsetX, width - 1));
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

export function resolveDisplacementScale(
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

export function encodeMaps(
	displacementX: Float32Array,
	displacementY: Float32Array,
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

	return {
		displacementMap,
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

