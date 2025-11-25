/// <reference types='vitest' />

import {nxCopyAssetsPlugin} from '@nx/vite/plugins/nx-copy-assets.plugin';
import {nxViteTsPaths} from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import {reactRouter} from '@react-router/dev/vite';
import {defineConfig} from 'vite';

export default defineConfig(() => ({
	root: import.meta.dirname,
	cacheDir: '../../node_modules/.vite/apps/management-frontend',
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
	plugins: [!process.env.VITEST && reactRouter(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
	// Uncomment this if you are using workers.
	// worker: {
	//  plugins: [ nxViteTsPaths() ],
	// },
	build: {
		outDir: '../../dist/apps/management-frontend',
		emptyOutDir: true,
		reportCompressedSize: true,
		commonjsOptions: {
			transformMixedEsModules: true,
		},
	},
	test: {
		name: 'management-frontend',
		watch: false,
		globals: true,
		environment: 'jsdom',
		include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
		reporters: ['default'],
		coverage: {
			reportsDirectory: '../../coverage/apps/management-frontend',
			provider: 'v8' as const,
		},
	},
}));
