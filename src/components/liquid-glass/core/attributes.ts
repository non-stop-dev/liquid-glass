import type { LiquidGlassEdges, LiquidGlassProps } from "./types.js";

export const liquidGlassAttributeNames = [
	"id",
	"shape",
	"radius",
	"bezel",
	"scale",
	"active-edges",
	"fill-refraction",
	"interior-lens",
	"deformation-x",
	"deformation-y",
	"frosted",
	"frosted-tint",
] as const;

export type LiquidGlassAttributeName = (typeof liquidGlassAttributeNames)[number];
export type LiquidGlassElementAttributes = Partial<
	Record<LiquidGlassAttributeName, string>
>;

export function serializeLiquidGlassEdges(edges: LiquidGlassEdges): string {
	if (typeof edges === "string") {
		return edges;
	}

	return edges.join(",");
}

export function liquidGlassPropsToAttributes(
	props: Partial<LiquidGlassProps>,
): LiquidGlassElementAttributes {
	const attributes: LiquidGlassElementAttributes = {};

	assignAttribute(attributes, "id", props.id);
	assignAttribute(attributes, "shape", props.shape);
	assignAttribute(attributes, "radius", props.radius);
	assignAttribute(attributes, "bezel", props.bezel);
	assignAttribute(attributes, "scale", props.scale);
	assignAttribute(
		attributes,
		"active-edges",
		props.activeEdges === undefined
			? undefined
			: serializeLiquidGlassEdges(props.activeEdges),
	);
	assignAttribute(
		attributes,
		"fill-refraction",
		props.fillRefraction === undefined ? undefined : String(props.fillRefraction),
	);
	assignAttribute(attributes, "interior-lens", props.interiorLens);
	assignAttribute(attributes, "deformation-x", props.deformationX);
	assignAttribute(attributes, "deformation-y", props.deformationY);
	assignAttribute(attributes, "frosted", props.frosted);
	assignAttribute(attributes, "frosted-tint", props.frostedTint);

	return attributes;
}

function assignAttribute(
	attributes: LiquidGlassElementAttributes,
	name: LiquidGlassAttributeName,
	value: boolean | number | string | undefined,
): void {
	if (value === undefined) {
		return;
	}

	attributes[name] = String(value);
}
