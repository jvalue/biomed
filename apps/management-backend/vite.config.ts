import { join } from 'path';
import { defineConfig } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';

export default defineConfig({
	server: {
		port: 3000,
	},
	build: {
		sourcemap: true,
	},
	plugins: [
		...VitePluginNode({
			adapter: 'nest',
			appPath: join(__dirname, 'src/main.ts'),
			tsCompiler: 'swc',
		}),
	],
	optimizeDeps: {
		exclude: ['@nestjs/microservices', '@nestjs/websockets', 'cache-manager'],
	},
});
