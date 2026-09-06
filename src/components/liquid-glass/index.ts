export { liquidGlassPropsToAttributes, liquidGlassAttributeNames, serializeLiquidGlassEdges } from "./core/attributes.js";
export type { LiquidGlassAttributeName, LiquidGlassElementAttributes } from "./core/attributes.js";
export { defineLiquidGlassElement, liquidGlassElementName, observedLiquidGlassAttributes } from "./core/define-element.js";
export { mountLiquidGlassSurface } from "./core/dom.js";
export type { LiquidGlassSurfaceController } from "./core/dom.js";
export { createLiquidGlassMaps, normalizeLiquidGlassControl, liquidGlassControlRange, getDprBucket } from "./core/maps.js";
export type { LiquidGlassShape, LiquidGlassRadius, LiquidGlassEdge, LiquidGlassEdges, LiquidGlassInteriorLens, LiquidGlassFrostedTint, LiquidGlassControl, LiquidGlassProps, LiquidGlassMapOptions, LiquidGlassMaps } from "./core/types.js";

import { defineLiquidGlassElement } from "./core/define-element.js";

defineLiquidGlassElement();
