import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const copyTargets = [
	{
		from: "src/liquid-glass/core/liquid-glass.css",
		to: "dist/liquid-glass/core/liquid-glass.css",
	},
	{
		from: "src/liquid-glass/astro/LiquidGlassSurface.astro",
		to: "dist/liquid-glass/astro/LiquidGlassSurface.astro",
	},
	{
		from: "src/liquid-glass/astro/LiquidGlassSurface.astro.d.ts",
		to: "dist/liquid-glass/astro/LiquidGlassSurface.astro.d.ts",
	},
	{
		from: ".agents/skills/liquid-glass",
		to: "dist/.agents/skills/liquid-glass",
	},
];

for (const target of copyTargets) {
	const from = resolve(root, target.from);
	const to = resolve(root, target.to);

	if (!existsSync(from)) {
		continue;
	}

	await mkdir(dirname(to), { recursive: true });
	await cp(from, to, { recursive: true });
}
