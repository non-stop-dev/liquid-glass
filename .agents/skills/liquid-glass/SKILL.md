---
name: liquid-glass
description: Build, debug, or review Apple-style liquid glass UI effects using SVG displacement maps and CSS backdrop-filter. Use for tasks involving liquid glass, backdrop refraction, feDisplacementMap, deterministic red/green displacement maps, rounded-rect or capsule lens physics, navbar/card glass primitives, or replacing glassmorphism/turbulence with physically coherent refraction.
---

# Liquid Glass

Use this skill when implementing or fixing a liquid glass surface that should refract the backdrop, not distort its own text or children.

## Core Workflow

1. Build the glass as an empty background layer behind content.
2. Apply one `backdrop-filter: url(#filter-id) ...` to that empty layer.
3. Keep all interactive content in a separate higher `z-index` layer.
4. Generate a deterministic displacement map from shape geometry, not noise.
5. Encode X displacement in red, Y displacement in green, neutral as `128`.
6. Use a rounded-rect/circle signed-distance field to derive surface normals.
7. For convex glass, sample inward from the surface into the body of the glass; avoid outward sampling at clipped edges.
8. Set edge displacement to zero at the exact boundary, ramp it in over the bezel, and fade it smoothly through the lens body.
9. Use optional `specularHighlight` overlays only when they are generated from the same normal field and do not create fixed artifacts.
10. Verify in browser with high-contrast content crossing top, bottom, sides, corners, and center.

## Non-Negotiables

- Do not use SVG turbulence noise as the main displacement source. It creates noisy ice, not convex glass.
- Do not apply `filter: url(...)` to the navbar/card element containing text. That distorts foreground content.
- Do not rely on blur/glassmorphism alone. Blur tints backdrop; it does not bend it.
- Do not use fixed inset shadows as the optical rim when the user expects physical refraction.
- Do not let the displacement map sample outward across rounded clips. This creates permanent crescent artifacts in corners.

## When Details Matter

Read [references/svg-displacement-physics.md](references/svg-displacement-physics.md) when you need implementation details, formulas, code snippets, property explanations, examples, or artifact debugging.

## Quick Pattern

Use this DOM structure:

```html
<div class="glass-host">
  <LiquidGlassSurface class="absolute inset-0" />
  <div class="content-layer">Sharp links, buttons, text</div>
</div>
```

The glass layer owns the `backdrop-filter`; the content layer remains normal HTML.

## Validation Checklist

- Confirm `data-liquid-glass-ready="true"` or equivalent runtime readiness.
- Confirm one active backdrop filter per surface.
- Confirm generated map dimensions match the rendered surface aspect ratio.
- Confirm center and edge behavior by moving high-contrast text behind the surface.
- Confirm top and bottom edges react symmetrically.
- Confirm no fixed crescent/leaf-like marks remain when backdrop content changes.
- Run the project build or typecheck after edits.
