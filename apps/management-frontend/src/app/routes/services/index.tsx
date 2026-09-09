import { createFileRoute } from '@tanstack/react-router';
import { AuthGuard } from '@/src/app/components/guards/auth-guard';
import { PermissionGuard } from '@/src/app/components/guards/permission-guard';
import ServicesList from '@/src/app/components/services/services-list';
import { useAuth } from '../../contexts/AuthContext';

export const Route = createFileRoute('/services/')({
	component: RouteComponent,
});

function RouteComponent() {
	const { ability } = useAuth();
	return (
		<AuthGuard>
			<PermissionGuard
				ability={ability}
				required={[{ action: 'read', subject: 'service', label: 'read services' }]}
			>
				<div className="space-y-4">
					<div className="flex flex-col gap-1">
						<h1 className="text-2xl font-bold tracking-tight text-slate-900">
							Services & Long-Running Apps
						</h1>
						<p className="text-sm text-slate-500">
							Monitor and manage long-running services (XML ingestors, MCP servers, downloaders).
						</p>
					</div>
					<ServicesList />
				</div>
			</PermissionGuard>
		</AuthGuard>
	);
}
