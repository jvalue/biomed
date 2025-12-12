/// <reference types='vitest' />

import {nxCopyAssetsPlugin} from '@nx/vite/plugins/nx-copy-assets.plugin';
import {nxViteTsPaths} from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import {defineConfig} from 'vite';
import {TanStackRouterVite} from '@tanstack/router-vite-plugin';

export default defineConfig({
	root: __dirname,
	cacheDir: '../../node_modules/.vite/apps/management-frontend',
	base: '/crawler-management',
	server: {
		port: 4201,
		host: 'localhost',
		fs: {
			allow: ['../..'],
		},
	},
	preview: {
		port: 4201,
		host: 'localhost',
	},
	plugins: [
		TanStackRouterVite({
				routesDirectory: 'src/app/routes',
			}),
			nxViteTsPaths(),
			nxCopyAssetsPlugin(['*.md'])
	],
	build: {
		outDir: '../../dist/apps/management-frontend',
		emptyOutDir: true,
		reportCompressedSize: true,
		commonjsOptions: {
			transformMixedEsModules: true,
		},
	},
});
