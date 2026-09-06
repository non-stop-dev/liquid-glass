interface GlassCodeControls {
	radius: string;
	bezel: string;
	frosted: string;
	scale: string;
	tint: string;
	lens: string;
}

export function updateGlassCode(code: string, { radius, bezel, frosted, scale, tint, lens }: GlassCodeControls): string {
	return code
		.replaceAll(/radius="[^"]*"/g, `radius="${radius}"`)
		.replaceAll(/radius=\{[^}]*\}/g, `radius={${radius}}`)
		.replaceAll(/(?<![\w-])radius:\s*(?:"[^"]*"|[\d.]+)/g, `radius: ${radius}`)
		.replaceAll(/bezel="[^"]*"/g, `bezel="${bezel}"`)
		.replaceAll(/scale="[^"]*"/g, `scale="${scale}"`)
		.replaceAll(/frosted="[^"]*"/g, `frosted="${frosted}"`)
		.replaceAll(/frosted-tint="[^"]*"/g, `frosted-tint="${tint}"`)
		.replaceAll(/interior-lens="[^"]*"/g, `interior-lens="${lens}"`)
		.replaceAll(/bezel=\{[^}]*\}/g, `bezel={${bezel}}`)
		.replaceAll(/scale=\{[^}]*\}/g, `scale={${scale}}`)
		.replaceAll(/frosted=\{[^}]*\}/g, `frosted={${frosted}}`)
		.replaceAll(/frostedTint="[^"]*"/g, `frostedTint="${tint}"`)
		.replaceAll(/interiorLens="[^"]*"/g, `interiorLens="${lens}"`)
		.replaceAll(/bezel:\s*[\d.]+/g, `bezel: ${bezel}`)
		.replaceAll(/scale:\s*[\d.]+/g, `scale: ${scale}`)
		.replaceAll(/frosted:\s*[\d.]+/g, `frosted: ${frosted}`)
		.replaceAll(/frostedTint:\s*"[^"]*"/g, `frostedTint: "${tint}"`)
		.replaceAll(/interiorLens:\s*"[^"]*"/g, `interiorLens: "${lens}"`);
}
