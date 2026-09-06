/** Lens geometry. */
export type LiquidGlassShape = "rounded-rect" | "circle";

/** "capsule" or normalized 0-10 radius. */
export type LiquidGlassRadius = "capsule" | number;

/** Physical edge names used for refraction masks. */
export type LiquidGlassEdge = "top" | "right" | "bottom" | "left";

/** All edges, no edges, one edge, or a readonly list of selected edges. */
export type LiquidGlassEdges =
	| "all"
	| "none"
	| LiquidGlassEdge
	| readonly LiquidGlassEdge[];

/** Interior lens deformation model. */
export type LiquidGlassInteriorLens = "linear" | "fisheye";

/** Tint direction for the frosted readability layer. */
export type LiquidGlassFrostedTint = "black" | "white";

/**
 * Normalized 0-10 control value. Decimals are rounded to one place.
 * Examples: 0, 1.2, 4.5, 10.
 */
export type LiquidGlassControl = number;

export interface LiquidGlassProps {
	/** Stable DOM id for the custom element host. Internal filter ids are generated independently. */
	id: string;

	/** Lens geometry. "rounded-rect" works for pills/cards; "circle" for round buttons. */
	shape?: LiquidGlassShape;

	/** "capsule" or normalized 0-10 radius. "capsule" resolves to half the shortest side. */
	radius?: LiquidGlassRadius;

	/** Normalized 0-10 edge ramp width. */
	bezel?: LiquidGlassControl;

	/** Normalized 0-10 base displacement intensity. */
	scale?: LiquidGlassControl;

	/** Which edges participate in refraction. */
	activeEdges?: LiquidGlassEdges;

	/** When true, the whole surface participates in refraction instead of bezel only. */
	fillRefraction?: boolean;

	/** Interior lens mode. "linear" is default; "fisheye" bends the whole lens interior. */
	interiorLens?: LiquidGlassInteriorLens;

	/** Normalized 0-10 X-axis deformation strength for fisheye mode. */
	deformationX?: LiquidGlassControl;

	/** Normalized 0-10 Y-axis deformation strength for fisheye mode. */
	deformationY?: LiquidGlassControl;

	/** Normalized 0-10 frosted readability layer. */
	frosted?: LiquidGlassControl;

	/** Tint direction for frosted readability layer. */
	frostedTint?: LiquidGlassFrostedTint;
}

export interface LiquidGlassMapOptions {
	width: number;
	height: number;
	shape: LiquidGlassShape;
	radius: LiquidGlassRadius;
	bezel: number;
	activeEdges: LiquidGlassEdges;
	dpr: number;
	scale: number;
	fillRefraction?: boolean;
	interiorLens?: LiquidGlassInteriorLens;
	deformationX?: number;
	deformationY?: number;
}

export interface LiquidGlassMaps {
	displacementMap: string;
	mapWidth: number;
	mapHeight: number;
	radius: number;
	bezel: number;
	dprBucket: number;
	displacementScale: number;
}
