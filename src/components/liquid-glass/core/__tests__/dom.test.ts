import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLiquidGlassSurface } from "../dom.js";
import { defineLiquidGlassElement } from "../define-element.js";
import { createLiquidGlassMaps } from "../maps.js";

vi.mock("../maps.js", async (importOriginal) => {
	const original = await importOriginal<typeof import("../maps.js")>();
	return { ...original, createLiquidGlassMaps: vi.fn() };
});

const disconnect = vi.fn();
const observe = vi.fn();
const generatedMap = {
	displacementMap: "data:image/png;base64,test",
	mapWidth: 448,
	mapHeight: 256,
	radius: 15.36,
	bezel: 2,
	dprBucket: 1,
	displacementScale: 24,
};

beforeEach(() => {
	vi.mocked(createLiquidGlassMaps).mockReset().mockReturnValue(generatedMap);
	vi.stubGlobal("CSS", { supports: vi.fn(() => true) });
	vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Chrome/140.0.0.0");
	vi.stubGlobal("ResizeObserver", class {
		observe = observe;
		disconnect = disconnect;
	});
	vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 448, 256));
	observe.mockClear();
	disconnect.mockClear();
});

afterEach(() => {
	document.body.replaceChildren();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

function mountFixture() {
	document.body.innerHTML = `<svg><filter id="card-filter">
		<feImage data-liquid-glass-displacement-image />
		<feDisplacementMap data-liquid-glass-displacement-map />
	</filter></svg><div data-liquid-glass-filter-id="card-filter" data-liquid-glass-radius="1.2"></div>`;
	const surface = document.querySelector("div");
	if (!surface) throw new Error("Missing test surface");
	const controller = mountLiquidGlassSurface(surface);
	if (!controller) throw new Error("Missing test controller");
	return { surface, controller };
}

describe("liquid glass rendering lifecycle", () => {
	it("uses the generated pixel radius, including after resize", () => {
		const { surface, controller } = mountFixture();
		expect(surface.style.getPropertyValue("--liquid-glass-radius")).toBe("15.36px");
		vi.mocked(createLiquidGlassMaps).mockReturnValueOnce({ ...generatedMap, radius: 12 });
		controller.update();
		expect(surface.style.getPropertyValue("--liquid-glass-radius")).toBe("12px");
		controller.destroy();
		expect(disconnect).toHaveBeenCalledOnce();
	});

	it("does not treat CSS syntax support in an unverified engine as working SVG refraction", () => {
		vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Version/18.0 Safari/605.1.15");
		const { surface } = mountFixture();
		expect(createLiquidGlassMaps).not.toHaveBeenCalled();
		expect(surface.dataset.liquidGlassFallbackReason).toBe("unsupported-browser");
		expect(surface.dataset.liquidGlassReady).toBeUndefined();
		expect(surface.style.getPropertyValue("--liquid-glass-radius")).toBe("15.36px");
	});

	it("clears stale filter state and reports a generation failure, then recovers", () => {
		const { surface, controller } = mountFixture();
		const errorListener = vi.fn();
		const log = vi.spyOn(console, "error").mockImplementation(() => {});
		surface.addEventListener("liquid-glass-error", errorListener);
		vi.mocked(createLiquidGlassMaps).mockImplementationOnce(() => { throw new Error("Canvas unavailable"); });
		controller.update();
		expect(surface.style.getPropertyValue("backdrop-filter")).toBe("");
		expect(surface.dataset.liquidGlassReady).toBeUndefined();
		expect(surface.dataset.liquidGlassSvgBackdrop).toBeUndefined();
		expect(surface.dataset.liquidGlassFallbackReason).toBe("generation-failed");
		expect(errorListener).toHaveBeenCalledOnce();
		expect(log).toHaveBeenCalledOnce();
		controller.update();
		expect(surface.dataset.liquidGlassReady).toBe("true");
		expect(surface.dataset.liquidGlassFallbackReason).toBeUndefined();
	});

	it("can initialize and update without ResizeObserver", () => {
		vi.stubGlobal("ResizeObserver", undefined);
		const { surface, controller } = mountFixture();
		expect(surface.dataset.liquidGlassReady).toBe("true");
		controller.update();
		controller.destroy();
	});

	it("uses an inscribed circular clip for a non-square circle", () => {
		const { surface, controller } = mountFixture();
		surface.dataset.liquidGlassShape = "circle";
		vi.mocked(createLiquidGlassMaps).mockReturnValueOnce({ ...generatedMap, radius: 128 });
		controller.update();
		expect(surface.style.clipPath).toBe("circle(128px at 50% 50%)");
	});

	it("preserves nodes and observer, batches geometry changes, and skips maps for tint or identical values", async () => {
		defineLiquidGlassElement();
		const host = document.createElement("liquid-glass-surface");
		const hostSetProperty = vi.spyOn(host.style, "setProperty");
		document.body.append(host);
		const surface = host.querySelector<HTMLElement>(".liquid-glass");
		const svg = host.querySelector("svg");
		vi.mocked(createLiquidGlassMaps).mockClear();
		host.setAttribute("radius", "2");
		host.setAttribute("bezel", "3");
		await Promise.resolve();
		expect(createLiquidGlassMaps).toHaveBeenCalledOnce();
		expect(createLiquidGlassMaps).toHaveBeenLastCalledWith(expect.objectContaining({ radius: 2, bezel: 3 }));
		expect(hostSetProperty).toHaveBeenCalledWith("backdrop-filter", expect.stringMatching(/^url\("#liquid-glass-\d+-filter"\)/));
		expect(host.style.getPropertyValue("backdrop-filter")).not.toContain("blur(");
		expect(host.style.getPropertyValue("will-change")).toBe("backdrop-filter");
		expect(surface?.style.getPropertyValue("backdrop-filter")).toBe("");
		expect(svg?.querySelector("[data-liquid-glass-frosted-blur]")?.getAttribute("stdDeviation")).toBe("0.25");
		vi.mocked(createLiquidGlassMaps).mockClear();
		host.setAttribute("radius", "2");
		host.setAttribute("frosted", "7");
		host.setAttribute("frosted-tint", "black");
		await Promise.resolve();
		expect(createLiquidGlassMaps).not.toHaveBeenCalled();
		expect(svg?.querySelector("[data-liquid-glass-frosted-blur]")?.getAttribute("stdDeviation")).toBe("5.5");
		expect(host.querySelector(".liquid-glass")).toBe(surface);
		expect(host.querySelector("svg")).toBe(svg);
		expect(observe).toHaveBeenCalledOnce();
		expect(disconnect).not.toHaveBeenCalled();
		expect(surface?.getAttribute("style")).toContain("--liquid-glass-frosted-tint: 0 0 0");
		host.remove();
		expect(disconnect).toHaveBeenCalledOnce();
		document.body.append(host);
		expect(host.querySelector("svg")).toBe(svg);
		expect(observe).toHaveBeenCalledTimes(2);
	});
});
