import { createFileRoute } from '@tanstack/react-router';
import CrawlerTargetsComponent from '@/src/app/components/health/crawler-targets.component';
import SystemHealthComponent from '@/src/app/components/health/system-health.component';

export const Route = createFileRoute('/health-status')({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="space-y-6">
			<h1>Health Status</h1>

			{/* System Components Section */}
			<SystemHealthComponent />

			{/* Crawler Targets Section */}
			<CrawlerTargetsComponent />
		</div>
	);
}
