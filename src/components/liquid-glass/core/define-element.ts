import { liquidGlassAttributeNames } from "./attributes.js";
import { mountLiquidGlassSurface, type LiquidGlassSurfaceController } from "./dom.js";

export const liquidGlassElementName = "liquid-glass-surface";
export const observedLiquidGlassAttributes = liquidGlassAttributeNames;
const svgNamespace = "http://www.w3.org/2000/svg";
const xlinkNamespace = "http://www.w3.org/1999/xlink";
const neutralMap = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='rgb(128,128,128)'/%3E%3C/svg%3E";
let generatedElementId = 0;

export function defineLiquidGlassElement(): void {
	if (typeof globalThis.customElements === "undefined" || customElements.get(liquidGlassElementName)) return;

	// Evaluate the browser base class only when registering in a browser.
	class LiquidGlassSurfaceElement extends HTMLElement {
		static observedAttributes = observedLiquidGlassAttributes;
		#controller: LiquidGlassSurfaceController | null = null;
		#surface: HTMLElement | null = null;
		#scheduled = false;
		#geometryChanged = false;

		connectedCallback(): void {
			if (!this.#surface) {
				const filterId = `liquid-glass-${++generatedElementId}-filter`;
				const svg = createSvgFilter(filterId, `${filterId}-map`);
				this.#surface = createSurface(filterId);
				this.replaceChildren(svg, this.#surface);
			}
			this.#syncAttributes();
			this.#controller = mountLiquidGlassSurface(this.#surface, this);
		}

		disconnectedCallback(): void {
			this.#controller?.destroy();
			this.#controller = null;
		}

		attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
			if (!this.isConnected || previous === next || name === "id") return;
			this.#geometryChanged ||= name !== "frosted" && name !== "frosted-tint";
			if (this.#scheduled) return;
			this.#scheduled = true;
			queueMicrotask(() => {
				this.#scheduled = false;
				const geometryChanged = this.#geometryChanged;
				this.#geometryChanged = false;
				if (!this.isConnected) return;
				this.#syncAttributes();
				this.#controller?.update(geometryChanged);
			});
		}

		#syncAttributes(): void {
			if (!this.#surface) return;
			for (const name of observedLiquidGlassAttributes) {
				if (name === "id") continue;
				const value = this.getAttribute(name);
				const target = `data-liquid-glass-${name}`;
				if (value === null) this.#surface.removeAttribute(target);
				else this.#surface.setAttribute(target, value);
			}
		}
	}
	customElements.define(liquidGlassElementName, LiquidGlassSurfaceElement);
}

function createSvgFilter(filterId: string, mapId: string): SVGSVGElement {
	const svg = document.createElementNS(svgNamespace, "svg");
	const defs = document.createElementNS(svgNamespace, "defs");
	const filter = document.createElementNS(svgNamespace, "filter");
	const feImage = document.createElementNS(svgNamespace, "feImage");
	const frostedBlur = document.createElementNS(svgNamespace, "feGaussianBlur");
	const displacement = document.createElementNS(svgNamespace, "feDisplacementMap");

	svg.classList.add("liquid-glass__svg");
	svg.setAttribute("aria-hidden", "true");
	svg.setAttribute("focusable", "false");
	svg.setAttribute("xmlns", svgNamespace);
	svg.setAttribute("xmlns:xlink", xlinkNamespace);

	filter.id = filterId;
	filter.setAttribute("x", "0");
	filter.setAttribute("y", "0");
	filter.setAttribute("width", "1");
	filter.setAttribute("height", "1");
	filter.setAttribute("filterUnits", "userSpaceOnUse");
	filter.setAttribute("color-interpolation-filters", "sRGB");
	filter.setAttribute("data-liquid-glass-filter", "");

	feImage.id = mapId;
	feImage.setAttribute("href", neutralMap);
	feImage.setAttributeNS(xlinkNamespace, "xlink:href", neutralMap);
	feImage.setAttribute("x", "0");
	feImage.setAttribute("y", "0");
	feImage.setAttribute("width", "1");
	feImage.setAttribute("height", "1");
	feImage.setAttribute("preserveAspectRatio", "none");
	feImage.setAttribute("result", mapId);
	feImage.setAttribute("data-liquid-glass-displacement-image", "");

	frostedBlur.setAttribute("in", "SourceGraphic");
	frostedBlur.setAttribute("stdDeviation", "0.25");
	frostedBlur.setAttribute("result", `${filterId}-frosted-source`);
	frostedBlur.setAttribute("data-liquid-glass-frosted-blur", "");

	displacement.setAttribute("in", `${filterId}-frosted-source`);
	displacement.setAttribute("in2", mapId);
	displacement.setAttribute("scale", "44");
	displacement.setAttribute("xChannelSelector", "R");
	displacement.setAttribute("yChannelSelector", "G");
	displacement.setAttribute("data-liquid-glass-displacement-map", "");

	filter.append(feImage, frostedBlur, displacement);
	defs.append(filter);
	svg.append(defs);

	return svg;
}

function createSurface(filterId: string): HTMLDivElement {
	const surface = document.createElement("div");
	surface.className = "liquid-glass";
	surface.dataset.liquidGlass = "";
	surface.dataset.liquidGlassFilterId = filterId;
	const tint = document.createElement("div");
	tint.className = "liquid-glass__tint";
	tint.setAttribute("aria-hidden", "true");
	surface.append(tint);
	return surface;
}
