import { createLiquidGlassMaps, normalizeLiquidGlassControl, resolveRadius } from "./maps.js";
import type { LiquidGlassEdge, LiquidGlassEdges, LiquidGlassInteriorLens, LiquidGlassRadius, LiquidGlassShape } from "./types.js";

interface LiquidGlassSurfaceElements {
	surface: HTMLElement;
	filter: Element;
	feImage: SVGFEImageElement;
	displacement: SVGFEDisplacementMapElement;
}

export interface LiquidGlassSurfaceController {
	update: (geometryChanged?: boolean) => void;
	destroy: () => void;
}

export function mountLiquidGlassSurface(surface: HTMLElement): LiquidGlassSurfaceController | null {
	const filter = document.getElementById(surface.dataset.liquidGlassFilterId ?? "");
	const feImage = filter?.querySelector<SVGFEImageElement>("[data-liquid-glass-displacement-image]");
	const displacement = filter?.querySelector<SVGFEDisplacementMapElement>("[data-liquid-glass-displacement-map]");
	if (!filter || filter.localName !== "filter" || !feImage || !displacement) {
		setFallback(surface, "missing-filter");
		reportError(surface, new Error("Liquid Glass filter elements are missing. Mount the complete SVG filter and surface together."));
		return null;
	}
	const elements = { surface, filter, feImage, displacement };
	const update = (geometryChanged = true) => updateLiquidGlassSurface(elements, geometryChanged);
	const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => update());
	observer?.observe(surface);
	update();
	return { update, destroy: () => observer?.disconnect() };
}

function updateLiquidGlassSurface(elements: LiquidGlassSurfaceElements, geometryChanged: boolean): void {
	const { surface } = elements;
	applyFrostedStyles(surface);
	if (!geometryChanged && surface.dataset.liquidGlassReady === "true") {
		applyBackdrop(elements);
		return;
	}
	const rect = surface.getBoundingClientRect();
	const options = readSurfaceOptions(surface, rect.width, rect.height);
	const radius = resolveRadius(rect.width, rect.height, options.radius, options.shape);
	surface.style.setProperty("--liquid-glass-radius", `${radius}px`);
	// A circle is inscribed in its box, including when the host is not square.
	surface.style.clipPath = options.shape === "circle" ? `circle(${radius}px at 50% 50%)` : "";
	if (rect.width < 1 || rect.height < 1) {
		setFallback(surface, "zero-size");
		return;
	}
	if (!supportsSvgBackdropFilter()) {
		setFallback(surface, "unsupported-browser");
		return;
	}
	try {
		const maps = createLiquidGlassMaps(options);
		const width = String(Math.round(rect.width));
		const height = String(Math.round(rect.height));
		elements.filter.setAttribute("width", width);
		elements.filter.setAttribute("height", height);
		elements.feImage.setAttribute("href", maps.displacementMap);
		elements.feImage.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", maps.displacementMap);
		elements.feImage.setAttribute("width", width);
		elements.feImage.setAttribute("height", height);
		elements.displacement.setAttribute("scale", String(maps.displacementScale));
		surface.style.setProperty("--liquid-glass-radius", `${maps.radius}px`);
		applyBackdrop(elements);
		// Ready means the map and filter are installed, not a pixel-level rendering probe.
		surface.dataset.liquidGlassReady = "true";
		delete surface.dataset.liquidGlassFallback;
		delete surface.dataset.liquidGlassFallbackReason;
	} catch (cause) {
		setFallback(surface, "generation-failed");
		reportError(surface, new Error("Liquid Glass map generation failed. Check canvas availability and the surface dimensions, then retry update().", { cause }));
	}
}

function applyFrostedStyles(surface: HTMLElement): void {
	const frosted = readFrosted(surface);
	surface.style.setProperty("--liquid-glass-frosted-tint", surface.dataset.liquidGlassFrostedTint === "black" ? "0 0 0" : "255 255 255");
	surface.style.setProperty("--liquid-glass-frosted-alpha", String(0.05 + frosted * 0.035));
	surface.style.setProperty("--liquid-glass-frosted-blur", `${0.25 + frosted * 0.75}px`);
	surface.style.setProperty("--liquid-glass-frosted-saturate", String(Math.max(0.86, 1.12 - frosted * 0.026)));
}

function applyBackdrop({ surface, filter }: LiquidGlassSurfaceElements): void {
	const frosted = readFrosted(surface);
	const value = [
		`url("#${filter.id}")`,
		`blur(${formatCssNumber(0.25 + frosted * 0.75)}px)`,
		`contrast(${formatCssNumber(1.18 - frosted * 0.018)})`,
		`brightness(${formatCssNumber(1.08 - frosted * 0.006)})`,
		`saturate(${formatCssNumber(Math.max(0.86, 1.12 - frosted * 0.026))})`,
	].join(" ");
	surface.style.setProperty("backdrop-filter", value);
	surface.style.setProperty("-webkit-backdrop-filter", value);
	surface.dataset.liquidGlassSvgBackdrop = "true";
}

function setFallback(surface: HTMLElement, reason: string): void {
	surface.style.removeProperty("backdrop-filter");
	surface.style.removeProperty("-webkit-backdrop-filter");
	delete surface.dataset.liquidGlassReady;
	delete surface.dataset.liquidGlassSvgBackdrop;
	surface.dataset.liquidGlassFallback = "true";
	surface.dataset.liquidGlassFallbackReason = reason;
}

function reportError(surface: HTMLElement, error: Error): void {
	surface.dispatchEvent(new CustomEvent<Error>("liquid-glass-error", { detail: error, bubbles: true, composed: true }));
	console.error(error);
}

function readSurfaceOptions(
	surface: HTMLElement,
	width: number,
	height: number,
): Parameters<typeof createLiquidGlassMaps>[0] {
	return {
		width,
		height,
		shape: readShape(surface),
		radius: readRadius(surface),
		bezel: readControl(surface.dataset.liquidGlassBezel, 5),
		activeEdges: readEdges(surface.dataset.liquidGlassActiveEdges),
		dpr: window.devicePixelRatio || 1,
		scale: readControl(surface.dataset.liquidGlassScale, 4),
		fillRefraction: surface.dataset.liquidGlassFillRefraction === "true",
		interiorLens: readInteriorLens(surface),
		deformationX: readControl(surface.dataset.liquidGlassDeformationX, 2),
		deformationY: readControl(surface.dataset.liquidGlassDeformationY, 1.5),
	};
}

function readShape(surface: HTMLElement): LiquidGlassShape {
	return surface.dataset.liquidGlassShape === "circle" ? "circle" : "rounded-rect";
}

function readRadius(surface: HTMLElement): LiquidGlassRadius {
	const value = surface.dataset.liquidGlassRadius;

	if (!value || value === "capsule") {
		return "capsule";
	}

	const parsedRadius = readNumber(value, 10);

	if (!Number.isFinite(parsedRadius)) {
		return "capsule";
	}

	return normalizeLiquidGlassControl(parsedRadius, 10);
}

function readFrosted(surface: HTMLElement): number {
	return readControl(surface.dataset.liquidGlassFrosted, 0);
}

function readInteriorLens(surface: HTMLElement): LiquidGlassInteriorLens {
	const lens = surface.dataset.liquidGlassInteriorLens;

	if (lens === "fisheye") {
		return lens;
	}

	return "linear";
}

function readControl(value: string | undefined, fallback: number): number {
	return normalizeLiquidGlassControl(readNumber(value, fallback), fallback);
}

function readNumber(value: string | undefined, fallback: number): number {
	if (!value) {
		return fallback;
	}

	const parsedValue = Number(value);

	return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function formatCssNumber(value: number): string {
	return String(Math.round(value * 1000) / 1000);
}

function readEdges(value: string | undefined): LiquidGlassEdges {
	if (!value || value === "all") {
		return "all";
	}

	if (value === "none") {
		return "none";
	}

	const edges = value
		.split(",")
		.map((edge) => edge.trim())
		.filter(isLiquidGlassEdge);

	return edges.length > 0 ? edges : "all";
}

function isLiquidGlassEdge(edge: string): edge is LiquidGlassEdge {
	return edge === "top" || edge === "right" || edge === "bottom" || edge === "left";
}

function supportsSvgBackdropFilter(): boolean {
	// CSS.supports only checks syntax. Restrict URL refraction to Chromium;
	// other engines use the explicit CSS blur/tint fallback until verified.
	const chromium = /(?:Chrome|Chromium)\/\d+/.test(navigator.userAgent);
	return chromium && typeof CSS !== "undefined" && typeof CSS.supports === "function"
		&& CSS.supports("backdrop-filter", 'url("#liquid-glass-filter")');
}
