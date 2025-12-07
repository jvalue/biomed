import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
	component: () => (
		<div>
			<h2>About Page</h2>
			<p>This is the about page for the application.</p>
		</div>
	),
});
