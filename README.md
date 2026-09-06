# @non-stop-dev/liquid-glass

> Modern, optical liquid glass surface primitives for the web platform, Astro, and React.

Experience real backdrop refraction with customizable lenses, bezels, frosted overlays, and fluid optical physics — built as a framework-agnostic custom element with zero-overhead Astro and React wrappers.

## Features

- **Framework Agnostic**: Native Custom Element (`<liquid-glass-surface>`) works in any modern framework or vanilla JS.
- **First-Class Wrappers**: Dedicated, typed components for **Astro** and **React**.
- **Optical Refraction**: Physically accurate displacement maps with fisheye and linear lens modes.
- **Progressive Enhancement**: Real refraction in supported engines, with an elegant frosted fallback.
- **Fully Customizable**: Control radius, bezel ramp, deformation strength, frosting, and tints with intuitive props.

## Installation

```sh
# pnpm
pnpm add @non-stop-dev/liquid-glass

# npm
npm install @non-stop-dev/liquid-glass

# bun / yarn
bun add @non-stop-dev/liquid-glass
yarn add @non-stop-dev/liquid-glass
```

## Usage

### 1. Astro

The Astro component imports the necessary styles and registers the custom element automatically:

```astro
---
import { LiquidGlassSurface } from "@non-stop-dev/liquid-glass/astro";
---

<div class="relative h-16 w-80 overflow-hidden rounded-full border border-white/10">
  <!-- The glass surface renders as an empty background layer -->
  <LiquidGlassSurface
    id="nav-glass"
    class="absolute inset-0"
    radius="capsule"
    bezel={1}
    scale={4}
    activeEdges="all"
    fillRefraction
    interiorLens="fisheye"
    deformationX={3}
    deformationY={3}
    frosted={4}
    frostedTint="black"
  />

  <!-- Place your content in a layer above the glass surface -->
  <nav class="relative z-10 flex h-full items-center justify-between px-6 text-white">
    <span class="font-bold">Brand</span>
    <span>Menu</span>
  </nav>
</div>
```

---

### 2. React (Next.js, Vite, Remix)

The React wrapper registers the custom element and exposes typed props:

```tsx
import { LiquidGlassSurface } from "@non-stop-dev/liquid-glass/react";

export function FloatingNav() {
  return (
    <div className="relative h-16 w-80 overflow-hidden rounded-full border border-white/10">
      {/* Liquid glass background layer */}
      <LiquidGlassSurface
        id="react-nav-glass"
        className="absolute inset-0"
        radius="capsule"
        bezel={1}
        scale={4}
        activeEdges="all"
        fillRefraction
        interiorLens="fisheye"
        deformationX={3}
        deformationY={3}
        frosted={4}
        frostedTint="white"
      />

      {/* Content layer */}
      <nav className="relative z-10 flex h-full items-center justify-between px-6 text-white">
        <span className="font-bold">Home</span>
        <span>Explore</span>
      </nav>
    </div>
  );
}
```

---

### 3. HTML & Vanilla JavaScript / Web Components

Import the self-registering element and CSS styles:

```html
<!-- Via ES Module bundler (Vite, Webpack, etc.) -->
<script type="module">
  import "@non-stop-dev/liquid-glass";
  import "@non-stop-dev/liquid-glass/styles.css";
</script>

<div class="glass-container" style="position: relative; overflow: hidden; border-radius: 9999px;">
  <liquid-glass-surface
    id="custom-surface"
    style="position: absolute; inset: 0;"
    radius="capsule"
    bezel="1"
    scale="4"
    active-edges="all"
    fill-refraction="true"
    interior-lens="fisheye"
    deformation-x="3"
    deformation-y="3"
    frosted="4"
    frosted-tint="black"
  ></liquid-glass-surface>

  <div style="position: relative; z-index: 10; padding: 1rem 1.5rem; color: white;">
    Hello Liquid Glass
  </div>
</div>
```

---

## Props Reference

| Prop | HTML Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `id` | `string` | **Required** | Stable DOM identifier for the host element. |
| `shape` | `shape` | `"rounded-rect"` \| `"circle"` | `"rounded-rect"` | Overall geometry of the lens. |
| `radius` | `radius` | `"capsule"` \| `number` (0–10) | `"capsule"` | Corner curvature. `"capsule"` rounds the shortest side. |
| `bezel` | `bezel` | `number` (0–10) | `5` | Width and intensity of the outer bezel edge ramp. |
| `scale` | `scale` | `number` (0–10) | `4` | Refraction and displacement strength. |
| `activeEdges` | `active-edges` | `"all"` \| `"none"` \| `Edge` \| `Edge[]` | `"all"` | Which edges participate in refraction (`"top"`, `"right"`, `"bottom"`, `"left"`). |
| `fillRefraction` | `fill-refraction` | `boolean` | `false` | Whether optical refraction fills the interior surface or only the bezel. |
| `interiorLens` | `interior-lens` | `"linear"` \| `"fisheye"` | `"linear"` | Deformation curve for the interior surface. |
| `deformationX` | `deformation-x` | `number` (0–10) | `2` | Horizontal distortion intensity in fisheye mode. |
| `deformationY` | `deformation-y` | `number` (0–10) | `1.5` | Vertical distortion intensity in fisheye mode. |
| `frosted` | `frosted` | `number` (0–10) | `0` | Blur/frosted diffusion layer strength for text readability. |
| `frostedTint` | `frosted-tint` | `"white"` \| `"black"` | `"white"` | Tint shade applied across the frosted diffusion layer. |

> **Note:** Put content in a separate layer above the glass surface (with a higher `z-index`) so that text, icons, and interactive controls remain sharp and clickable.

---

## License

[MIT](LICENSE)
