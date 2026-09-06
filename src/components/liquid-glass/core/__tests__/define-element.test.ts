import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
	liquidGlassElementName,
	observedLiquidGlassAttributes,
} from "../define-element.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const coreDir = resolve(currentDir, "..");

describe("liquid glass custom element contract", () => {
	it("uses the expected custom element name and observes current public attributes", () => {
		expect(liquidGlassElementName).toBe("liquid-glass-surface");
		expect(observedLiquidGlassAttributes).not.toContain("specular-highlight");
		expect(observedLiquidGlassAttributes).toContain("deformation-x");
		expect(observedLiquidGlassAttributes).toContain("deformation-y");
	});

	it("keeps removed names and noise displacement out of the core implementation", () => {
		const implementation = [
			readFileSync(resolve(coreDir, "attributes.ts"), "utf8"),
			readFileSync(resolve(coreDir, "define-element.ts"), "utf8"),
			readFileSync(resolve(coreDir, "dom.ts"), "utf8"),
			readFileSync(resolve(coreDir, "maps.ts"), "utf8"),
			readFileSync(resolve(coreDir, "map-raster.ts"), "utf8"),
			readFileSync(resolve(coreDir, "liquid-glass.css"), "utf8"),
		].join("\n");
		const blockedTerms = [
			"edge" + "-push",
			"rim" + "Edges",
			"fisheye" + "Extreme",
			"fisheye" + "StrengthX",
			"fisheye" + "StrengthY",
			"fe" + "Turbulence",
			"box-shadow",
			"backgroundImage",
		];

		for (const term of blockedTerms) {
			expect(implementation).not.toContain(term);
		}

		expect(implementation).toContain("backdrop-filter");
		expect(implementation).toContain("feDisplacementMap");
		expect(implementation).not.toMatch(/specular/i);
	});
});
