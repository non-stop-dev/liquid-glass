# Rawr Labs Visual Components

Framework-agnostic visual primitives for Rawr Labs interfaces.

The first component is `liquid-glass-surface`, a custom element that renders one empty backdrop-filter layer backed by deterministic SVG displacement maps. The core custom element is the source of truth. Astro and React wrappers exist only for typed props, IntelliSense, and framework ergonomics.

Component source lives in dedicated folders under `src/components/`. The Astro documentation site lives in `src/pages/`.

## Install

```sh
pnpm add @rawr-labs/visual-components
```

## Plain Custom Element

Import the self-registering core entry and the CSS:

```ts
import "@rawr-labs/visual-components/liquid-glass";
import "@rawr-labs/visual-components/styles.css";
```

Use the element as an empty visual layer. Put content in a separate layer above it.

```html
<div class="nav-shell">
	<liquid-glass-surface
		id="nav-glass"
		radius="capsule"
		bezel="1"
		scale="4.3"
		active-edges="all"
		specular-highlight="none"
		fill-refraction="true"
		interior-lens="fisheye"
		deformation-x="3"
		deformation-y="3"
		frosted="4"
		frosted-tint="black"
	></liquid-glass-surface>
	<nav class="content-layer">Sharp text and controls</nav>
</div>
```

## Astro

The Astro wrapper imports the CSS and registers the custom element.

```astro
---
import { LiquidGlassSurface } from "@rawr-labs/visual-components/astro";
---

<div class="nav-shell">
	<LiquidGlassSurface
		id="nav-glass"
		class="absolute inset-0"
		radius="capsule"
		bezel={1}
		scale={4.3}
		activeEdges="all"
		specularHighlight="none"
		fillRefraction
		interiorLens="fisheye"
		deformationX={3}
		deformationY={3}
		frosted={4}
		frostedTint="black"
	/>
	<nav class="content-layer">Sharp text and controls</nav>
</div>
```

## React

The React wrapper imports the CSS and registers the custom element in an effect.

```tsx
import { LiquidGlassSurface } from "@rawr-labs/visual-components/react";

export function NavGlass() {
	return (
		<div className="nav-shell">
			<LiquidGlassSurface
				id="nav-glass"
				className="absolute inset-0"
				radius="capsule"
				bezel={1}
				scale={4.3}
				activeEdges="all"
				specularHighlight="none"
				fillRefraction
				interiorLens="fisheye"
				deformationX={3}
				deformationY={3}
				frosted={4}
				frostedTint="black"
			/>
			<nav className="content-layer">Sharp text and controls</nav>
		</div>
	);
}
```

## Props

Numeric controls use a normalized `0-10` range. Decimals are accepted and rounded to one decimal place.

| Prop | Attribute | Values | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | `id` | string | required | Stable id used to link the SVG filter and backdrop-filter. |
| `shape` | `shape` | `"rounded-rect"` or `"circle"` | `"rounded-rect"` | Lens geometry. |
| `radius` | `radius` | `"capsule"` or number | `"capsule"` | Capsule resolves to half the shortest side. Numeric values use the normalized range. |
| `bezel` | `bezel` | number | `5` | Edge ramp width. |
| `scale` | `scale` | number | `4` | Base displacement intensity. |
| `activeEdges` | `active-edges` | `"all"`, `"none"`, edge, or edge list | `"all"` | Edges that participate in refraction. Edges are `top`, `right`, `bottom`, `left`. |
| `specularHighlight` | `specular-highlight` | `"all"`, `"none"`, edge, or edge list | `"all"` | Edges that receive normal-based rim lighting. |
| `fillRefraction` | `fill-refraction` | boolean | `false` | Refracts the whole surface instead of only the bezel. |
| `interiorLens` | `interior-lens` | `"linear"` or `"fisheye"` | `"linear"` | Interior lens deformation model. |
| `deformationX` | `deformation-x` | number | `2` | X-axis deformation strength for fisheye mode. |
| `deformationY` | `deformation-y` | number | `1.5` | Y-axis deformation strength for fisheye mode. |
| `frosted` | `frosted` | number | `0` | Readability layer strength. |
| `frostedTint` | `frosted-tint` | `"black"` or `"white"` | `"white"` | Tint direction for the frosted layer. |

## Physics Notes

The surface uses SVG `feImage` plus `feDisplacementMap` through CSS `backdrop-filter: url(#filter-id)`. Red encodes X displacement, green encodes Y displacement, and neutral displacement is `128`. The blue channel stays neutral and alpha stays opaque.

The displacement map is generated from rounded-rect or circle geometry and must match the rendered aspect ratio. Maps regenerate on mount, resize, or attribute changes. They are cached by size, radius, bezel, shape, active edges, specular highlight, scale, lens mode, deformation values, fill mode, and DPR bucket.

The turbulence primitive is not used. Content must live outside the filtered layer, above the custom element, so text and controls remain sharp.

## Credits

- [Kube: Liquid Glass CSS SVG](https://kube.io/blog/liquid-glass-css-svg/#svg-filter-as-backdrop-filter)
- [shuding/liquid-glass](https://github.com/shuding/liquid-glass)
