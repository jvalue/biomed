import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import App from './app';
import About from './routes/about';
import WorkflowList from './routes/workflow-list';

const rootRoute = createRootRoute({
	component: App,
});

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	component: WorkflowList,
});

const aboutRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/about',
	component: About,
});

const routeTree = rootRoute.addChildren([indexRoute, aboutRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}
