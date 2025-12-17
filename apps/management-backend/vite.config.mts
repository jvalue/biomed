import { join, resolve } from 'path';
import { defineConfig } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';

export default defineConfig({
	server: {
		port: 3002,
		cors: false
	},
	root: __dirname,
	build: {
		sourcemap: true,
		outDir: resolve(__dirname, '../../dist/apps/management-backend'),
		emptyOutDir: true
	},
	plugins: [
		... VitePluginNode({
			adapter: 'nest',
			appPath: join(__dirname, 'src/main.ts'),
			tsCompiler: 'swc',
			swcOptions: {
				sourceMaps: true,
				inlineSourcesContent: true,
			},
		}),
	],
	optimizeDeps: {
		exclude: ['@nestjs/microservices', '@nestjs/websockets', 'cache-manager'],
	},
});
