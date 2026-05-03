import { describe, expect, it } from "vitest";

import type { LiquidGlassSurfaceProps } from "../LiquidGlassSurface.js";

describe("LiquidGlassSurface React props", () => {
	it("accepts documented current prop names", () => {
		const props = {
			id: "react-glass",
			radius: "capsule",
			bezel: 1,
			scale: 4.3,
			activeEdges: ["top", "bottom"],
			specularHighlight: "none",
			fillRefraction: true,
			interiorLens: "fisheye",
			deformationX: 3,
			deformationY: 3,
			frosted: 4,
			frostedTint: "black",
		} satisfies LiquidGlassSurfaceProps;

		expect(props.id).toBe("react-glass");
	});
});
