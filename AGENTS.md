# Visual Components Repository Instructions

## Project Shape
- Use Astro as the documentation/site framework.
- Use Tailwind CSS for the site UI through `@tailwindcss/vite`.
- Keep visual component implementations in dedicated folders under `src/components/`.
- Keep documentation and showcase pages under `src/pages/`.
- Do not create a separate `examples/` folder for component examples.
- The home page lives at `src/pages/index.astro`.
- The components index lives at `src/pages/components/index.astro`.

## Components Page
- The Components page should include a sidebar listing visual components.
- Selecting a component should lead to an article section for that component.
- Each component article should include multiple visual examples and code blocks.
- Code examples should use tabs where useful.
- For liquid glass usage tabs, include HTML, CSS, Tailwind, TypeScript, Astro, and React examples.

## Design
- Keep the current green as the primary color and yellow as the secondary color.
- Use the Tailwind theme tokens in `src/styles/global.css`:
  - primary: `#3fe7cb`
  - secondary: `#ffda5c`
- Keep the UI dark, sharp, and documentation-focused.

## Liquid Glass Architecture
- `src/components/liquid-glass/core/` remains the framework-agnostic source of truth.
- Astro and React wrappers must stay thin convenience layers.
- Do not duplicate liquid-glass physics in wrappers or pages.
- The custom element should render an empty visual layer only; content belongs above it.

## Tooling
- Use `pnpm` for all JavaScript/TypeScript workflows.
- Use Astro docs/MCP when version-specific Astro guidance is needed.
- Run relevant checks before finishing: package build, typecheck, tests, and Astro site build.
