# Rawr Labs Visual Components

Framework-agnostic visual primitives for Rawr Labs interfaces.

The first component is `liquid-glass-surface`, a custom element that renders one empty backdrop-filter layer backed by deterministic SVG displacement maps. The core custom element is the source of truth. Astro and React wrappers exist only for typed props, IntelliSense, and framework ergonomics.

Component source lives in dedicated folders under `src/components/`. The Astro documentation site lives in `src/pages/`.

## Install

```sh
pnpm add @rawr-labs/liquid-glass
```

## Local development and release preparation

The documentation site imports the same public package exports that consumers use. Build the package before starting the site so local changes to the Liquid Glass core are reflected in `dist`:

```sh
pnpm install
pnpm build
pnpm dev
```

Before a release, run the checks and inspect the exact archive that would be uploaded:

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm site:build
pnpm pack --dry-run
pnpm publish --dry-run
```

The package is configured for public publication to the npm registry. Once you have selected a new version and logged in with an account that can publish the `@rawr-labs` scope, publish with:

```sh
pnpm publish
```

## Plain Custom Element

Import the self-registering core entry and the CSS:

```ts
import "@rawr-labs/liquid-glass";
import "@rawr-labs/liquid-glass/styles.css";
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
import { LiquidGlassSurface } from "@rawr-labs/liquid-glass/astro";
---

<div class="nav-shell">
	<LiquidGlassSurface
		id="nav-glass"
		class="absolute inset-0"
		radius="capsule"
		bezel={1}
		scale={4.3}
		activeEdges="all"
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
import { LiquidGlassSurface } from "@rawr-labs/liquid-glass/react";

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
| `id` | `id` | string | required | Stable DOM id for the custom element host. Internal filter ids are generated independently. |
| `shape` | `shape` | `"rounded-rect"` or `"circle"` | `"rounded-rect"` | Lens geometry. |
| `radius` | `radius` | `"capsule"` or number | `"capsule"` | Capsule resolves to half the shortest side. Numeric values use the normalized range. |
| `bezel` | `bezel` | number | `5` | Edge ramp width. |
| `scale` | `scale` | number | `4` | Base displacement intensity. |
| `activeEdges` | `active-edges` | `"all"`, `"none"`, edge, or edge list | `"all"` | Edges that participate in refraction. Edges are `top`, `right`, `bottom`, `left`. |
| `fillRefraction` | `fill-refraction` | boolean | `false` | Refracts the whole surface instead of only the bezel. |
| `interiorLens` | `interior-lens` | `"linear"` or `"fisheye"` | `"linear"` | Interior lens deformation model. |
| `deformationX` | `deformation-x` | number | `2` | X-axis deformation strength for fisheye mode. |
| `deformationY` | `deformation-y` | number | `1.5` | Y-axis deformation strength for fisheye mode. |
| `frosted` | `frosted` | number | `0` | Readability layer strength. |
| `frostedTint` | `frosted-tint` | `"black"` or `"white"` | `"white"` | Tint direction for the frosted layer. |

## Physics Notes

The surface uses SVG `feImage` plus `feDisplacementMap` through CSS `backdrop-filter: url(#filter-id)`. Red encodes X displacement, green encodes Y displacement, and neutral displacement is `128`. The blue channel stays neutral and alpha stays opaque.

The displacement map is generated from rounded-rect or circle geometry and must match the rendered aspect ratio. Maps regenerate on mount, resize, or geometry changes; synchronous attribute changes are batched. Frosted and tint changes reuse the existing map, SVG, and observer. They are cached by size, radius, bezel, shape, active edges, scale, lens mode, deformation values, fill mode, and DPR bucket.

The turbulence primitive is not used. Content must live outside the filtered layer, above the custom element, so text and controls remain sharp.

## Credits

- [Kube: Liquid Glass CSS SVG](https://kube.io/blog/liquid-glass-css-svg/#svg-filter-as-backdrop-filter)
- [shuding/liquid-glass](https://github.com/shuding/liquid-glass)

SVG backdrop refraction is enabled for Chromium browsers that accept URL filters. Other engines use the explicit blur/tint fallback; CSS syntax support alone is not proof of SVG rendering. `data-liquid-glass-ready` means the map and filter are installed. Fallback surfaces expose `data-liquid-glass-fallback-reason`. Generation failures clear the filter, emit a bubbling `liquid-glass-error` event with an `Error` in `detail`, and log the error.
