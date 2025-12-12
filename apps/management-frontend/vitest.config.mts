import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		name: 'management-frontend',
		watch: false,
		globals: true,
		environment: 'jsdom',
		include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
		reporters: ['default'],
		coverage: {
			reportsDirectory: '../../coverage/apps/management-frontend',
			provider: 'v8',
		},
		passWithNoTests: true
	},
});
