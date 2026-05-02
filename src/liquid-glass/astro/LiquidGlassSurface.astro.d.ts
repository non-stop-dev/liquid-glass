import type { AstroComponentFactory } from "astro/runtime/server/index.js";

import type { LiquidGlassProps } from "../core/types.js";

export interface Props extends LiquidGlassProps {
	/** CSS class applied to the custom element host. */
	class?: string;
}

declare const LiquidGlassSurface: AstroComponentFactory & ((props: Props) => unknown);

export default LiquidGlassSurface;
