import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
	outDir: "site-dist",
	vite: {
		plugins: [tailwindcss()],
	},
});
