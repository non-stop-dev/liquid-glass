import { expect, it } from "vitest";
import { updateGlassCode } from "../demo-code.js";

it("updates radius in each usage language without changing CSS border-radius", () => {
	const controls = { radius: "3", bezel: "1", frosted: "4", scale: "1", tint: "white", lens: "linear" };
	const code = 'radius="capsule" radius={1.2} radius: 1.2, border-radius: 0.5rem;';
	expect(updateGlassCode(code, controls)).toBe('radius="3" radius={3} radius: 3, border-radius: 0.5rem;');
});
