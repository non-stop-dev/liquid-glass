declare module "*.astro" {
	const component: unknown;
	export default component;
}

declare module "*.css" {
	const href: string;
	export default href;
}
