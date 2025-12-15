// src/router.tsx
import { createRouter } from '@tanstack/react-router';
import { routeTree } from '../routeTree.gen';

// You must export a getRouter function that
// returns a new router instance each time
export function getRouter() {
	const router = createRouter({
		routeTree,
		scrollRestoration: true,
		basepath: '/crawler-management',
	});

	return router;
}
