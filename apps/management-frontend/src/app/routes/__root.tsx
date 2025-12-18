import { createRootRoute, Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import App from '../app';

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: 'utf-8',
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1',
			},
			{
				title: 'Biomed Crawler Management',
			},
		],
	}),
	component: RootComponent,
});

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
}

// biome-ignore lint/correctness/noUnusedFunctionParameters: <default config>
function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return <App />;
}
