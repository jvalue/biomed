import { createFileRoute } from '@tanstack/react-router';
import CrawlerRunList from '@/src/app/components/crawler-runs/crawler-run-list';
import { AuthGuard } from '@/src/app/components/guards/auth-guard';
import { PermissionGuard } from '@/src/app/components/guards/permission-guard';
import { useAuth } from '../contexts/AuthContext';

export const Route = createFileRoute('/crawler-runs')({
	component: RouteComponent,
});

function RouteComponent() {
	const { ability } = useAuth();
	return (
		<AuthGuard>
			<PermissionGuard
				ability={ability}
				required={[{ action: 'read', subject: 'workflow', label: 'read workflows' }]}
			>
				<h1>Crawler Runs</h1>
				<CrawlerRunList />
			</PermissionGuard>
		</AuthGuard>
	);
}
