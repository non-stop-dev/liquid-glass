import {
	liquidGlassAttributeNames,
	serializeLiquidGlassEdges,
} from "./attributes.js";
import { mountLiquidGlassSurface } from "./dom.js";
import { normalizeLiquidGlassControl } from "./maps.js";
import type {
	LiquidGlassEdges,
	LiquidGlassEdge,
	LiquidGlassFrostedTint,
	LiquidGlassInteriorLens,
	LiquidGlassRadius,
	LiquidGlassShape,
} from "./types.js";
import type { LiquidGlassSurfaceController } from "./dom.js";

export const liquidGlassElementName = "liquid-glass-surface";
export const observedLiquidGlassAttributes = liquidGlassAttributeNames;

const svgNamespace = "http://www.w3.org/2000/svg";
const xlinkNamespace = "http://www.w3.org/1999/xlink";
const neutralMap =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='rgb(128,128,128)'/%3E%3C/svg%3E";

let generatedElementId = 0;

interface RenderOptions {
	baseId: string;
	filterId: string;
	mapId: string;
	shape: LiquidGlassShape;
	radius: LiquidGlassRadius;
	serializedRadius: string;
	bezel: number;
	scale: number;
	activeEdges: LiquidGlassEdges;
	specularHighlight: LiquidGlassEdges;
	hasSpecularHighlight: boolean;
	fillRefraction: boolean;
	interiorLens: LiquidGlassInteriorLens;
	deformationX: number;
	deformationY: number;
	frosted: number;
	frostedTint: LiquidGlassFrostedTint;
	borderRadius: string;
	frostedTintRgb: string;
	frostedTintAlpha: number;
	frostedBlur: number;
	frostedSaturate: number;
}

export class LiquidGlassSurfaceElement extends HTMLElement {
	static get observedAttributes(): readonly string[] {
		return observedLiquidGlassAttributes;
	}

	#controller: LiquidGlassSurfaceController | null = null;
	#fallbackId: string | null = null;

	connectedCallback(): void {
		this.#remount();
	}

	disconnectedCallback(): void {
		this.#controller?.destroy();
		this.#controller = null;
	}

	attributeChangedCallback(): void {
		if (!this.isConnected) {
			return;
		}

		this.#remount();
	}

	#remount(): void {
		this.#controller?.destroy();
		this.#controller = null;
		this.#render();

		const surface = this.querySelector<HTMLElement>("[data-liquid-glass]");

		if (surface) {
			this.#controller = mountLiquidGlassSurface(surface);
		}
	}

	#render(): void {
		const options = readRenderOptions(this);
		const svg = createSvgFilter(options);
		const surface = createSurface(options);

		this.replaceChildren(svg, surface);
	}

	get stableLiquidGlassId(): string {
		if (this.id) {
			return this.id;
		}

		if (!this.#fallbackId) {
			generatedElementId += 1;
			this.#fallbackId = `liquid-glass-${generatedElementId}`;
		}

		return this.#fallbackId;
	}
}

export function defineLiquidGlassElement(): void {
	if (
		typeof globalThis.customElements === "undefined" ||
		customElements.get(liquidGlassElementName)
	) {
		return;
	}

	customElements.define(liquidGlassElementName, LiquidGlassSurfaceElement);
}

function readRenderOptions(element: LiquidGlassSurfaceElement): RenderOptions {
	const baseId = element.stableLiquidGlassId;
	const shape = readShape(element);
	const radius = readRadius(element);
	const bezel = readControl(element.getAttribute("bezel"), 5);
	const scale = readControl(element.getAttribute("scale"), 4);
	const activeEdges = readEdges(element.getAttribute("active-edges"));
	const specularHighlight = readEdges(
		element.getAttribute("specular-highlight"),
	);
	const fillRefraction = element.getAttribute("fill-refraction") === "true";
	const interiorLens = readInteriorLens(element);
	const deformationX = readControl(element.getAttribute("deformation-x"), 2);
	const deformationY = readControl(element.getAttribute("deformation-y"), 1.5);
	const frosted = readControl(element.getAttribute("frosted"), 0);
	const frostedTint = readFrostedTint(element);
	const normalizedRadius =
		radius === "capsule" ? 10 : normalizeLiquidGlassControl(radius, 10);
	const serializedRadius = radius === "capsule" ? radius : String(normalizedRadius);
	const borderRadius =
		shape === "circle"
			? "50%"
			: radius === "capsule"
				? "9999px"
				: `${normalizedRadius * 5}%`;

	return {
		baseId,
		filterId: `${baseId}-filter`,
		mapId: `${baseId}-map`,
		shape,
		radius,
		serializedRadius,
		bezel,
		scale,
		activeEdges,
		specularHighlight,
		hasSpecularHighlight: specularHighlight !== "none",
		fillRefraction,
		interiorLens,
		deformationX,
		deformationY,
		frosted,
		frostedTint,
		borderRadius,
		frostedTintRgb: frostedTint === "black" ? "0 0 0" : "255 255 255",
		frostedTintAlpha: 0.05 + frosted * 0.035,
		frostedBlur: 0.25 + frosted * 0.75,
		frostedSaturate: Math.max(0.86, 1.12 - frosted * 0.026),
	};
}

function createSvgFilter(options: RenderOptions): SVGSVGElement {
	const svg = document.createElementNS(svgNamespace, "svg");
	const defs = document.createElementNS(svgNamespace, "defs");
	const filter = document.createElementNS(svgNamespace, "filter");
	const feImage = document.createElementNS(svgNamespace, "feImage");
	const displacement = document.createElementNS(svgNamespace, "feDisplacementMap");

	svg.classList.add("liquid-glass__svg");
	svg.setAttribute("aria-hidden", "true");
	svg.setAttribute("focusable", "false");
	svg.setAttribute("xmlns", svgNamespace);
	svg.setAttribute("xmlns:xlink", xlinkNamespace);

	filter.id = options.filterId;
	filter.setAttribute("x", "0");
	filter.setAttribute("y", "0");
	filter.setAttribute("width", "1");
	filter.setAttribute("height", "1");
	filter.setAttribute("filterUnits", "userSpaceOnUse");
	filter.setAttribute("color-interpolation-filters", "sRGB");
	filter.setAttribute("data-liquid-glass-filter", "");

	feImage.id = options.mapId;
	feImage.setAttribute("href", neutralMap);
	feImage.setAttributeNS(xlinkNamespace, "xlink:href", neutralMap);
	feImage.setAttribute("x", "0");
	feImage.setAttribute("y", "0");
	feImage.setAttribute("width", "1");
	feImage.setAttribute("height", "1");
	feImage.setAttribute("preserveAspectRatio", "none");
	feImage.setAttribute("result", options.mapId);
	feImage.setAttribute("data-liquid-glass-displacement-image", "");

	displacement.setAttribute("in", "SourceGraphic");
	displacement.setAttribute("in2", options.mapId);
	displacement.setAttribute("scale", "44");
	displacement.setAttribute("xChannelSelector", "R");
	displacement.setAttribute("yChannelSelector", "G");
	displacement.setAttribute("data-liquid-glass-displacement-map", "");

	filter.append(feImage, displacement);
	defs.append(filter);
	svg.append(defs);

	return svg;
}

function createSurface(options: RenderOptions): HTMLDivElement {
	const surface = document.createElement("div");
	const tint = document.createElement("div");
	const specular = document.createElement("div");

	surface.className = "liquid-glass";
	surface.dataset.liquidGlass = "";
	surface.dataset.liquidGlassFilterId = options.filterId;
	surface.dataset.liquidGlassShape = options.shape;
	surface.dataset.liquidGlassRadius = options.serializedRadius;
	surface.dataset.liquidGlassBezel = String(options.bezel);
	surface.dataset.liquidGlassScale = String(options.scale);
	surface.dataset.liquidGlassActiveEdges = serializeLiquidGlassEdges(
		options.activeEdges,
	);
	surface.dataset.liquidGlassSpecularHighlight = serializeLiquidGlassEdges(
		options.specularHighlight,
	);
	surface.dataset.liquidGlassSpecularActive = options.hasSpecularHighlight
		? "true"
		: "false";
	surface.dataset.liquidGlassFillRefraction = options.fillRefraction
		? "true"
		: "false";
	surface.dataset.liquidGlassInteriorLens = options.interiorLens;
	surface.dataset.liquidGlassDeformationX = String(options.deformationX);
	surface.dataset.liquidGlassDeformationY = String(options.deformationY);
	surface.dataset.liquidGlassFrosted = String(options.frosted);
	surface.dataset.liquidGlassFrostedTint = options.frostedTint;
	surface.style.setProperty("--liquid-glass-radius", options.borderRadius);
	surface.style.setProperty(
		"--liquid-glass-frosted-tint",
		options.frostedTintRgb,
	);
	surface.style.setProperty(
		"--liquid-glass-frosted-alpha",
		String(options.frostedTintAlpha),
	);
	surface.style.setProperty(
		"--liquid-glass-frosted-blur",
		`${options.frostedBlur}px`,
	);
	surface.style.setProperty(
		"--liquid-glass-frosted-saturate",
		String(options.frostedSaturate),
	);

	tint.className = "liquid-glass__tint";
	tint.setAttribute("aria-hidden", "true");

	specular.className = "liquid-glass__specular";
	specular.setAttribute("aria-hidden", "true");
	specular.dataset.liquidGlassSpecular = "";

	surface.append(tint, specular);

	return surface;
}

function readShape(element: HTMLElement): LiquidGlassShape {
	return element.getAttribute("shape") === "circle" ? "circle" : "rounded-rect";
}

function readRadius(element: HTMLElement): LiquidGlassRadius {
	const value = element.getAttribute("radius");

	if (!value || value === "capsule") {
		return "capsule";
	}

	const parsedRadius = Number(value);

	if (!Number.isFinite(parsedRadius)) {
		return "capsule";
	}

	return normalizeLiquidGlassControl(parsedRadius, 10);
}

function readEdges(value: string | null): LiquidGlassEdges {
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

function readInteriorLens(element: HTMLElement): LiquidGlassInteriorLens {
	return element.getAttribute("interior-lens") === "fisheye"
		? "fisheye"
		: "linear";
}

function readFrostedTint(element: HTMLElement): LiquidGlassFrostedTint {
	return element.getAttribute("frosted-tint") === "black" ? "black" : "white";
}

function readControl(value: string | null, fallback: number): number {
	if (!value) {
		return normalizeLiquidGlassControl(fallback, fallback);
	}

	const parsedValue = Number(value);

	return normalizeLiquidGlassControl(
		Number.isFinite(parsedValue) ? parsedValue : fallback,
		fallback,
	);
}
