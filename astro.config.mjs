import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
	outDir: "site-dist",
	vite: {
		// This self-import changes whenever the local library is rebuilt.
		optimizeDeps: { exclude: ["@non-stop-dev/liquid-glass"] },
		plugins: [tailwindcss()],
	},
});
