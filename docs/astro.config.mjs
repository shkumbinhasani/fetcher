// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: '@shkumbinhsn/fetcher',
			description: 'Type-safe fetch wrapper with Standard Schema validation and error handling',
			logo: {
				src: './src/assets/logo.svg',
				replacesTitle: true,
			},
			customCss: [
				'./src/styles/custom.css',
			],
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/shkumbinhasani/fetcher' },
				{ icon: 'npm', label: 'NPM', href: 'https://www.npmjs.com/package/@shkumbinhsn/fetcher' }
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'introduction' },
						{ label: 'Installation', slug: 'installation' },
						{ label: 'Quick Start', slug: 'quick-start' },
					],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Basic Usage', slug: 'guides/basic-usage' },
						{ label: 'Schema Validation', slug: 'guides/schema-validation' },
						{ label: 'Error Handling', slug: 'guides/error-handling' },
						{ label: 'TypeScript Integration', slug: 'guides/typescript' },
						{ label: 'React Query Integration', slug: 'guides/react-query' },
					],
				},
				{
					label: 'API Reference',
					items: [
						{ label: 'fetcher()', slug: 'api/fetcher' },
						{ label: 'defineError()', slug: 'api/define-error' },
						{ label: 'Types', slug: 'api/types' },
					],
				},
				{
					label: 'Examples',
					items: [
						{ label: 'Common Patterns', slug: 'examples/common-patterns' },
						{ label: 'Advanced Usage', slug: 'examples/advanced-usage' },
					],
				},
			],
		}),
	],
});
