import { describe, expect, it } from "vitest";

import {
	liquidGlassPropsToAttributes,
	serializeLiquidGlassEdges,
} from "../attributes.js";

describe("liquid glass attributes", () => {
	it("serializes edge selections for custom element attributes", () => {
		expect(serializeLiquidGlassEdges("all")).toBe("all");
		expect(serializeLiquidGlassEdges(["top", "bottom"])).toBe("top,bottom");
	});

	it("maps camelCase props to kebab-case custom element attributes", () => {
		expect(
			liquidGlassPropsToAttributes({
				id: "nav-glass",
				radius: "capsule",
				bezel: 1,
				scale: 4.3,
				activeEdges: "all",
				specularHighlight: "none",
				fillRefraction: true,
				interiorLens: "fisheye",
				deformationX: 3,
				deformationY: 3,
				frosted: 4,
				frostedTint: "black",
			}),
		).toEqual({
			id: "nav-glass",
			radius: "capsule",
			bezel: "1",
			scale: "4.3",
			"active-edges": "all",
			"specular-highlight": "none",
			"fill-refraction": "true",
			"interior-lens": "fisheye",
			"deformation-x": "3",
			"deformation-y": "3",
			frosted: "4",
			"frosted-tint": "black",
		});
	});
});
