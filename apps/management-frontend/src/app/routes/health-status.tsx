import { createFileRoute } from '@tanstack/react-router';
import { PermissionGuard } from '@/src/app/components/guards/permission-guard';
import CrawlerTargetsComponent from '@/src/app/components/health/crawler-targets.component';
import SystemHealthComponent from '@/src/app/components/health/system-health.component';
import { useAuth } from '@/src/app/contexts/AuthContext';
import { AuthGuard } from '../components/guards/auth-guard';

export const Route = createFileRoute('/health-status')({
	component: RouteComponent,
});

function RouteComponent() {
	const { ability } = useAuth();
	return (
		<AuthGuard>
			<PermissionGuard ability={ability} required={[{ action: 'read', subject: 'health' }]}>
				<div className="space-y-6">
					<h1>Health Status</h1>

					{/* System Components Section */}
					<SystemHealthComponent />

					{/* Crawler Targets Section */}
					<CrawlerTargetsComponent />
				</div>
			</PermissionGuard>
		</AuthGuard>
	);
}
