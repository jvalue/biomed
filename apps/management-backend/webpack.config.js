const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
	entry: {
		main: './src/main.ts',
		'migrations.main': './src/migrations.main.ts',
	},
	output: {
		path: join(__dirname, '../../dist/apps/management-backend'),
		clean: true,
		...(process.env.NODE_ENV !== 'production' && {
			devtoolModuleFilenameTemplate: '[absolute-resource-path]',
		}),
	},
	plugins: [
		new NxAppWebpackPlugin({
			target: 'node',
			compiler: 'tsc',
			main: './src/main.ts',
			tsConfig: './tsconfig.app.json',
			assets: ['./src/assets'],
			optimization: false,
			outputHashing: 'none',
			generatePackageJson: true,
			sourceMaps: true,
		}),
	],
};
