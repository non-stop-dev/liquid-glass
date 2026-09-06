// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

describe("server-side package usage", () => {
	it("imports the root without browser globals", async () => {
		const library = await import("../../../../index.js");
		expect(library.defineLiquidGlassElement).toBeTypeOf("function");
		expect(() => library.defineLiquidGlassElement()).not.toThrow();
	});

	it("renders the React wrapper on the server", async () => {
		const { LiquidGlassSurface } = await import("../../react/LiquidGlassSurface.js");
		const html = renderToString(createElement(LiquidGlassSurface, { id: "ssr-card", radius: 1.2 }));
		expect(html).toContain('radius="1.2"');
		expect(html).toContain("liquid-glass-surface");
	});
});
