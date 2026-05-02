import {
	createLiquidGlassMaps,
	normalizeLiquidGlassControl,
	type LiquidGlassEdge,
	type LiquidGlassEdges,
	type LiquidGlassInteriorLens,
	type LiquidGlassRadius,
	type LiquidGlassShape,
} from "./maps.js";

interface LiquidGlassSurfaceElements {
	surface: HTMLElement;
	filter: SVGFilterElement | null;
	feImage: SVGFEImageElement | null;
	displacement: SVGFEDisplacementMapElement | null;
	specular: HTMLElement | null;
}

export interface LiquidGlassSurfaceController {
	update: () => void;
	destroy: () => void;
}

const svgNamespace = "http://www.w3.org/1999/xlink";

export function mountLiquidGlassSurface(
	surface: HTMLElement,
): LiquidGlassSurfaceController | null {
	if (!("ResizeObserver" in window)) {
		surface.dataset.liquidGlassFallback = "true";

		return null;
	}

	const elements: LiquidGlassSurfaceElements = {
		surface,
		filter: readFilterElement(surface),
		feImage: null,
		displacement: null,
		specular: surface.querySelector<HTMLElement>("[data-liquid-glass-specular]"),
	};

	elements.feImage =
		elements.filter?.querySelector<SVGFEImageElement>(
			"[data-liquid-glass-displacement-image]",
		) ?? null;
	elements.displacement =
		elements.filter?.querySelector<SVGFEDisplacementMapElement>(
			"[data-liquid-glass-displacement-map]",
		) ?? null;

	if (!elements.filter || !elements.feImage || !elements.displacement) {
		surface.dataset.liquidGlassFallback = "true";

		return null;
	}

	const update = () => updateLiquidGlassSurface(elements);
	const observer = new ResizeObserver(() => {
		update();
	});

	observer.observe(surface);
	update();

	return {
		update,
		destroy: () => observer.disconnect(),
	};
}

function readFilterElement(surface: HTMLElement): SVGFilterElement | null {
	const filterId = surface.dataset.liquidGlassFilterId;

	if (!filterId) {
		return null;
	}

	const filter = document.getElementById(filterId);

	return filter instanceof SVGFilterElement ? filter : null;
}

function updateLiquidGlassSurface(elements: LiquidGlassSurfaceElements): void {
	const rect = elements.surface.getBoundingClientRect();

	if (rect.width < 1 || rect.height < 1) {
		elements.surface.dataset.liquidGlassFallback = "true";

		return;
	}

	const options = readSurfaceOptions(elements.surface, rect.width, rect.height);

	try {
		const maps = createLiquidGlassMaps(options);
		const filterWidth = String(Math.round(rect.width));
		const filterHeight = String(Math.round(rect.height));

		elements.filter?.setAttribute("x", "0");
		elements.filter?.setAttribute("y", "0");
		elements.filter?.setAttribute("width", filterWidth);
		elements.filter?.setAttribute("height", filterHeight);
		elements.feImage?.setAttribute("href", maps.displacementMap);
		elements.feImage?.setAttributeNS(
			svgNamespace,
			"xlink:href",
			maps.displacementMap,
		);
		elements.feImage?.setAttribute("width", filterWidth);
		elements.feImage?.setAttribute("height", filterHeight);
		elements.displacement?.setAttribute("scale", String(maps.displacementScale));

		if (elements.specular) {
			elements.specular.style.backgroundImage = `url("${maps.specularMap}")`;
		}

		elements.surface.dataset.liquidGlassReady = "true";

		if (supportsSvgBackdropFilter()) {
			const frosted = readFrosted(elements.surface);
			const filterValue = [
				`url(#${elements.filter?.id})`,
				`blur(${formatCssNumber(0.25 + frosted * 0.75)}px)`,
				`contrast(${formatCssNumber(1.18 - frosted * 0.018)})`,
				`brightness(${formatCssNumber(1.08 - frosted * 0.006)})`,
				`saturate(${formatCssNumber(Math.max(0.86, 1.12 - frosted * 0.026))})`,
			].join(" ");

			elements.surface.style.setProperty("backdrop-filter", filterValue);
			elements.surface.style.setProperty("-webkit-backdrop-filter", filterValue);
			elements.surface.dataset.liquidGlassSvgBackdrop = "true";
		} else {
			elements.surface.style.removeProperty("backdrop-filter");
			elements.surface.style.removeProperty("-webkit-backdrop-filter");
			delete elements.surface.dataset.liquidGlassSvgBackdrop;
		}

		delete elements.surface.dataset.liquidGlassFallback;
	} catch {
		delete elements.surface.dataset.liquidGlassReady;
		elements.surface.dataset.liquidGlassFallback = "true";
	}
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
		specularHighlight: readEdges(
			surface.dataset.liquidGlassSpecularHighlight,
		),
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
	if (
		!("CSS" in window) ||
		typeof CSS === "undefined" ||
		typeof CSS.supports !== "function"
	) {
		return false;
	}

	return (
		CSS.supports("backdrop-filter", 'url("#liquid-glass-filter")') ||
		CSS.supports("-webkit-backdrop-filter", 'url("#liquid-glass-filter")')
	);
}
