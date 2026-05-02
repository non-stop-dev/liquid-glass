import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { LiquidGlassSurface } from "@rawr-labs/visual-components/react";

import "./styles.css";

function App() {
	return (
		<main className="demo">
			<div className="background-copy" aria-hidden="true">
				<span>RAWR LABS</span>
				<span>VISUAL COMPONENTS</span>
				<span>LIQUID GLASS</span>
			</div>

			<header className="glass-host">
				<LiquidGlassSurface
					id="react-nav-glass"
					className="glass-layer"
					radius="capsule"
					bezel={1}
					scale={4.3}
					activeEdges="all"
					specularHighlight="none"
					fillRefraction
					interiorLens="fisheye"
					deformationX={3}
					deformationY={3}
					frosted={4}
					frostedTint="black"
				/>
				<nav className="content-layer" aria-label="Example navigation">
					<a href="/">Rawr Labs</a>
					<a href="#components">Components</a>
					<a href="#glass">Glass</a>
				</nav>
			</header>
		</main>
	);
}

createRoot(document.getElementById("root") as HTMLElement).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
