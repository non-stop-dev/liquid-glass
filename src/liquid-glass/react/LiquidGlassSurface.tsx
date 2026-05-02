import "../core/liquid-glass.css";

import { createElement, useEffect, type CSSProperties, type ReactElement } from "react";

import { defineLiquidGlassElement } from "../core/define-element.js";
import { liquidGlassPropsToAttributes } from "../core/attributes.js";
import type { LiquidGlassProps } from "../core/types.js";

export interface LiquidGlassSurfaceProps extends LiquidGlassProps {
	/** CSS class applied to the custom element host. */
	className?: string;

	/** Inline styles applied to the custom element host. */
	style?: CSSProperties;

	/** Content must be rendered outside the filtered layer, not as children. */
	children?: never;
}

export function LiquidGlassSurface({
	className,
	style,
	children: _children,
	...props
}: LiquidGlassSurfaceProps): ReactElement {
	useEffect(() => {
		defineLiquidGlassElement();
	}, []);

	const attributes = liquidGlassPropsToAttributes(props);

	return createElement("liquid-glass-surface", {
		...attributes,
		className,
		style,
	});
}
