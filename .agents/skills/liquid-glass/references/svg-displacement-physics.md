# SVG Displacement Liquid Glass Physics

## Table Of Contents

- Goal
- Mental Model
- SVG Filter Mechanics
- Layering Model
- Displacement Map Encoding
- Shape Field And Normals
- Convex Lens Sampling
- Bezel-Only Versus Filled Lens
- Rim And Specular Highlights
- Runtime Generation
- Properties
- Code Patterns
- Artifact Debugging
- Browser Verification

## Goal

Create a liquid glass surface that refracts the backdrop through a convex rounded-rect, capsule, or circle lens. The effect should feel smooth and deterministic. It should not look like frosted glass, ice, turbulence, or a static shadowed pill.

## Mental Model

CSS `backdrop-filter` filters pixels behind the element. SVG `feDisplacementMap` changes where those backdrop pixels are sampled from.

For an RG displacement map:

```ts
sampleX = x + scale * (red / 255 - 0.5)
sampleY = y + scale * (green / 255 - 0.5)
```

Neutral is `128`, because `128 / 255` is approximately `0.5`.

Result:

- `R=128, G=128` -> no movement.
- `R>128` -> sample farther right.
- `R<128` -> sample farther left.
- `G>128` -> sample lower.
- `G<128` -> sample higher.

Implementation note: depending on browser/filter interpretation, visual movement can feel opposite the encoded sampling direction. Debug using high-contrast vertical and horizontal test lines.

## SVG Filter Mechanics

Use an SVG filter referenced by CSS `backdrop-filter`, not `filter`.

```html
<svg aria-hidden="true" class="fixed size-0">
  <defs>
    <filter
      id="liquid-glass-filter"
      x="0"
      y="0"
      width="1"
      height="1"
      filterUnits="userSpaceOnUse"
      color-interpolation-filters="sRGB"
    >
      <feImage
        id="liquid-glass-map"
        href="data:image/png;base64,..."
        width="1"
        height="1"
        preserveAspectRatio="none"
        result="displacement_map"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="displacement_map"
        scale="42"
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  </defs>
</svg>
```

Result:

- `SourceGraphic` is the captured backdrop when the filter is used in `backdrop-filter`.
- The PNG map controls sampling.
- `preserveAspectRatio="none"` lets one map fill the exact rendered capsule size.

Set `filter` and `feImage` width/height at runtime to the measured surface size. A mismatched or square map causes late top/bottom reaction and incorrect corner behavior.

## Layering Model

Use two layers:

```html
<div class="glass-host">
  <div class="glass-refraction"></div>
  <div class="glass-content">
    <a>Rawr Labs</a>
    <nav>...</nav>
  </div>
</div>
```

```css
.glass-host {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: 9999px;
}

.glass-refraction {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  backdrop-filter: url("#liquid-glass-filter") blur(0.25px) brightness(1.05);
  -webkit-backdrop-filter: url("#liquid-glass-filter") blur(0.25px) brightness(1.05);
}

.glass-content {
  position: relative;
  z-index: 1;
}
```

Result:

- Backdrop bends.
- Text remains sharp.
- Buttons and links remain interactive.

If the filter is placed on the content element, foreground text deforms. If a child layer is filtered but browser behavior fails to capture the intended backdrop, move the `backdrop-filter` directly onto the empty glass surface.

## Displacement Map Encoding

Use deterministic RGBA pixels:

```ts
function encodeChannel(offset: number, scale: number): number {
  return Math.max(0, Math.min(255, Math.round(255 * (0.5 + offset / scale))));
}

data[i] = encodeChannel(offsetX, displacementScale);
data[i + 1] = encodeChannel(offsetY, displacementScale);
data[i + 2] = 128;
data[i + 3] = 255;
```

Result:

- `offsetX = 0, offsetY = 0` encodes neutral gray.
- Larger offsets become stronger red/green channel deviations.
- Blue stays neutral; alpha stays opaque.

Clamp practical navbar `scale` to about `20-80px`. Larger values usually create exaggerated warping and edge sampling artifacts.

## Shape Field And Normals

Use signed-distance fields to describe the lens shape.

Rounded rectangle SDF:

```ts
function roundedRectField(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const dx = x - width / 2;
  const dy = y - height / 2;
  const signX = dx < 0 ? -1 : 1;
  const signY = dy < 0 ? -1 : 1;
  const qx = Math.abs(dx) - (width / 2 - radius);
  const qy = Math.abs(dy) - (height / 2 - radius);
  const outsideX = Math.max(qx, 0);
  const outsideY = Math.max(qy, 0);
  const outsideDistance = Math.hypot(outsideX, outsideY);
  const insideDistance = Math.min(Math.max(qx, qy), 0);
  const signedDistance = outsideDistance + insideDistance - radius;

  return {
    distanceInside: -signedDistance,
    normal: roundedRectNormal(qx, qy, signX, signY),
  };
}
```

Normal:

```ts
function roundedRectNormal(qx: number, qy: number, signX: number, signY: number) {
  if (qx > 0 && qy > 0) {
    const length = Math.hypot(qx, qy) || 1;
    return { x: (signX * qx) / length, y: (signY * qy) / length };
  }

  if (qx > qy) return { x: signX, y: 0 };
  return { x: 0, y: signY };
}
```

Result:

- `distanceInside < 0` is outside the glass.
- `distanceInside = 0` is the exact boundary.
- Larger `distanceInside` moves toward the center.
- `normal` points outward from the closest lens surface.

## Convex Lens Sampling

For a convex surface, rays should be bent inward into the glass body. For a backdrop displacement map, that means the encoded sampling offset usually needs to be opposite the outward normal or opposite the center-radial direction.

Good filled-lens pattern:

```ts
function smootherstep(edge0: number, edge1: number, value: number): number {
  const x = Math.max(0, Math.min((value - edge0) / (edge1 - edge0), 1));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function filledLensOffset(
  x: number,
  y: number,
  width: number,
  height: number,
  distanceInside: number,
  bezel: number,
  requestedScale: number,
) {
  const centeredX = (x - width / 2) / Math.max(width / 2, 1);
  const centeredY = (y - height / 2) / Math.max(height / 2, 1);
  const radialDistance = Math.hypot(centeredX, centeredY);
  const safeDistance = radialDistance || 1;
  const edgeRelease = smootherstep(0, Math.max(1, bezel), distanceInside);
  const centerRelax = 1 - 0.1 * smootherstep(0.88, 1, Math.min(radialDistance, 1));
  const strength = edgeRelease * centerRelax;

  return {
    x: -centeredX * requestedScale * 0.34 * strength,
    y: -centeredY * requestedScale * 0.36 * strength,
    normalX: centeredX / safeDistance,
    normalY: centeredY / safeDistance,
  };
}
```

Result:

- Exact edge starts neutral because `edgeRelease = 0`.
- The lens bends inward after the boundary.
- Fixed corner crescents are reduced because the map does not pull clipped/outside samples at the rounded edge.
- Center remains coherent with the rest of the glass instead of becoming a separate optical region.

Bad pattern:

```ts
return {
  x: centeredX * requestedScale * 0.34 * strength,
  y: centeredY * requestedScale * 0.36 * strength,
};
```

Result:

- Samples outward.
- Rounded edges can pull clipped pixels.
- Static crescent/leaf artifacts appear in top or bottom corners.
- Physics reads as a separate rim deformation instead of a convex lens.

## Bezel-Only Versus Filled Lens

Bezel-only:

```ts
if (distanceInside <= bezel) {
  const t = distanceInside / bezel;
  const magnitude = smootherstep(0, 0.5, t) * (1 - smootherstep(0.7, 1, t));
  offsetX = -normal.x * magnitude * scale;
  offsetY = -normal.y * magnitude * scale;
}
```

Result:

- Strong edge refraction.
- Calm center.
- Good for subtle Apple-style capsule rims.
- Can look like the border is deforming separately if the user expects the entire object to behave as one filled lens.

Filled lens:

```ts
if (distanceInside >= 0) {
  const lens = filledLensOffset(x, y, width, height, distanceInside, bezel, scale);
  offsetX = lens.x;
  offsetY = lens.y;
}
```

Result:

- Whole surface refracts.
- The object reads as a single filled lens.
- Needs careful edge ramping to avoid permanent corner artifacts.

## Specular Highlight

Specular maps are optional and should never be confused with refraction. Generate them from the same normal field. The Apple-style model is a rim light: highlight intensity is strongest where the edge normal faces a fixed light direction, then fades around the object.

```ts
function specularAlpha(normalX: number, normalY: number, progress: number): number {
  const rimBand = smootherstep(0, 0.16, progress) * (1 - smootherstep(0.74, 1, progress));
  const lightX = -0.48;
  const lightY = -0.88;
  const facingLight = Math.max(0, normalX * lightX + normalY * lightY);
  const oppositeCatch = Math.max(0, normalX * -lightX + normalY * -lightY);
  const rimLight = 0.05 + facingLight ** 2.35 * 0.78 + oppositeCatch ** 5 * 0.1;
  return Math.min(0.72, rimBand * rimLight);
}
```

Result:

- Highlight follows the actual lens geometry.
- Brightness changes with normal angle relative to the fixed light direction.
- Highlight can be disabled with `specularHighlight={false}` or `specular-highlight="false"`.

Avoid:

```css
box-shadow: inset 0 -20px 30px rgb(255 255 255 / 30%);
```

Result:

- Static reflection never changes with the backdrop.
- Users perceive it as a hardcoded artifact.

## Runtime Generation

Use `ResizeObserver` and cache by geometry:

```ts
const cacheKey = [
  width,
  height,
  shape,
  radius,
  bezel,
  activeEdges,
  specularHighlight,
  scale,
  dprBucket,
  fillRefraction ? "filled" : "bezel",
].join(":");
```

Runtime steps:

1. Measure surface bounds.
2. Resolve map size, for example `512x96`, `768x128`, or scaled by DPR with max pixels.
3. Generate float displacement fields.
4. Apply a light deterministic blur to the vector field.
5. Encode RGBA PNG data URL with Canvas.
6. Set `feImage.href`.
7. Set `feDisplacementMap.scale`.
8. Apply `backdrop-filter: url(#filter-id) blur(.25px) brightness(...)`.

Do not regenerate per frame. Regenerate on mount and resize only.

## Properties

`id`: Stable id used to link the CSS `url(#filter)` to the SVG filter.

`shape`: `"rounded-rect"` or `"circle"`. Use rounded rect for navbars, cards, and pills. Use circle for circular glass buttons.

Public numeric controls use a normalized `0-10` scale and are rounded to one decimal place. Examples: `0`, `1.2`, `4.5`, `10`. Internally the component maps those controls to pixels, blur, or deformation strength.

`radius`: `"capsule"` or a normalized `0-10` radius. Capsule resolves to half of the shortest side. Numeric `0` is square, numeric `10` reaches the maximum rounded radius.

`bezel`: Normalized `0-10` width of the edge ramp. Internally maps from a very thin lip to roughly 38% of the shortest side. Smaller values create thinner borders; too small creates abrupt transitions.

`scale`: Normalized `0-10` base displacement intensity. Internally maps to about `20-80px` before per-mode axis multipliers and runtime clamping.

`activeEdges`: `"all"`, `"none"`, or selected edges. Use `"all"` for normal glass. Use one edge for border-only effects.

`specularHighlight`: `true` or `false` for the normal-based shine layer. Use `false` when highlights distract from backdrop refraction.

`fillRefraction`: `false` for bezel-only refraction; `true` for one filled convex lens.

`interiorLens`: `"linear"` or `"fisheye"`. Keep `"linear"` as the default. Use `"fisheye"` when the interior should bend backdrop content through the whole lens.

`deformationX`: Normalized `0-10` X-axis deformation strength for fisheye mode. Higher values increase horizontal bending across the lens.

`deformationY`: Normalized `0-10` Y-axis deformation strength for fisheye mode. Use lower values than X for wide navbars so the lens reads as a horizontal capsule instead of a circular bubble.

`frosted`: Normalized `0-10` readability layer strength. Keep `0` for polished clear glass. Increase it to add blur, reduce contrast slightly, desaturate the backdrop, and strengthen the tint without changing the displacement map.

`frostedTint`: `"black"` or `"white"`. Use `"black"` behind white text to darken the refracted backdrop. Use `"white"` behind dark text or on dark UI where a lighter frosted veil improves contrast.

`dpr`: Device pixel ratio bucket for map quality and cache size.

## Code Patterns

Astro primitive:

```astro
---
const filterId = `${Astro.props.id}-filter`;
const mapId = `${Astro.props.id}-map`;
---

<svg class="liquid-glass__svg" aria-hidden="true">
  <defs>
    <filter id={filterId} filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feImage id={mapId} preserveAspectRatio="none" result={mapId} />
      <feDisplacementMap
        in="SourceGraphic"
        in2={mapId}
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  </defs>
</svg>

<div
  class="liquid-glass absolute inset-0"
  data-liquid-glass
  data-liquid-glass-filter-id={filterId}
>
  <div class="liquid-glass__tint"></div>
</div>
```

DOM update:

```ts
const filterValue = `url(#${filter.id}) blur(0.25px) brightness(1.06) saturate(1.08)`;
surface.style.setProperty("backdrop-filter", filterValue);
surface.style.setProperty("-webkit-backdrop-filter", filterValue);
feImage.setAttribute("href", maps.displacementMap);
feImage.setAttribute("width", String(Math.round(rect.width)));
feImage.setAttribute("height", String(Math.round(rect.height)));
displacement.setAttribute("scale", String(maps.displacementScale));
```

Result:

- One active backdrop layer.
- Generated map matches the rendered surface.
- Content remains outside the filtered layer.

Opt-in fisheye interior:

```astro
<LiquidGlassSurface
  id="liquid-navbar"
  radius="capsule"
  bezel={3.5}
  scale={4}
  fillRefraction
  interiorLens="fisheye"
  deformationX={3}
  deformationY={2}
/>
```

Result:

- Current default behavior is preserved for surfaces without `interiorLens="fisheye"`.
- Pixels in the bezel ramp still transition smoothly from neutral.
- Interior pixels use a nonlinear axis curve, so high-contrast content bends more aggressively toward the lens extremes.
- X/Y deformation can be tuned independently without globally raising `scale`.

Opt-in frosted readability:

```astro
<LiquidGlassSurface
  id="liquid-navbar"
  radius="capsule"
  bezel={1.2}
  scale={4.3}
  fillRefraction
  frosted={4}
  frostedTint="black"
/>
```

Result:

- Current default remains polished because `frosted` defaults to `0`.
- `frosted={4}` adds moderate blur and dark tint while preserving refraction.
- `frostedTint="black"` improves white text readability over bright or busy backdrop content.
- `frostedTint="white"` is better when foreground text is dark.

## Artifact Debugging

Permanent corner crescents:

- Cause: outward sampling across rounded clipped boundaries, nonzero displacement at the exact edge, or static rim/shadow overlay.
- Fix: flip sampling inward, make edge magnitude start at `0`, disable `specularHighlight`, reduce bezel, and ensure `overflow: hidden` and matching radius.

Top/bottom do not refract until content reaches center:

- Cause: square or mismatched displacement map, `objectBoundingBox` filter mismatch, or neutral top/bottom rows.
- Fix: generate map for actual aspect ratio and use `preserveAspectRatio="none"`.

Text is blurry or warped:

- Cause: filter applied to the content element.
- Fix: move the filter to an empty absolute layer behind content.

Effect looks icy:

- Cause: turbulence/noise map.
- Fix: replace with deterministic SDF normal field.

Nothing refracts:

- Check `CSS.supports("backdrop-filter", 'url("#x")')`.
- Check the filter element exists in DOM before applying CSS.
- Check `feImage.href` is a PNG data URL.
- Check the surface has visible backdrop behind it.
- Try applying the `backdrop-filter` directly to the empty surface instead of a nested child layer.

## Browser Verification

Use a high-contrast test object moving behind the navbar:

- Large white heading behind top edge.
- Bright CTA crossing the center.
- Horizontal text crossing bottom edge.
- Objects near left and right rounded corners.

Expected result for a filled convex lens:

- The entire capsule bends the backdrop.
- The edge begins neutral at the clipped boundary, then bends inward through a smooth ramp.
- The center participates in the same lens field, not a separate optical region.
- Static marks disappear when the backdrop changes.

Expected result for a bezel lens:

- The edge bends strongly.
- The center is mostly clear.
- Top and bottom edges react symmetrically.
