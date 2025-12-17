import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		globals: true,
		include: ['src/**/*.spec.ts', '**/*.spec.ts'],
		setupFiles: ['./test-setup.ts'],
		coverage: {
			provider: 'v8',
			reportsDirectory: './coverage',
			reporter: ['text', 'lcov'],
			exclude: ['src/main.ts'],
		},
	},
});
