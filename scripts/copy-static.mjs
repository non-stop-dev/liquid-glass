import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The TypeScript build only emits library files. Remove output from older
// builds so the published tarball cannot retain documentation helpers.
await rm(resolve(root, "dist/components/site"), { recursive: true, force: true });
await rm(resolve(root, "dist/.agents"), { recursive: true, force: true });

const copyTargets = [
	{
		from: "src/components/liquid-glass/core/liquid-glass.css",
		to: "dist/components/liquid-glass/core/liquid-glass.css",
	},
	{
		from: "src/components/liquid-glass/astro/LiquidGlassSurface.astro",
		to: "dist/components/liquid-glass/astro/LiquidGlassSurface.astro",
	},
	{
		from: "src/components/liquid-glass/astro/LiquidGlassSurface.astro.d.ts",
		to: "dist/components/liquid-glass/astro/LiquidGlassSurface.astro.d.ts",
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
