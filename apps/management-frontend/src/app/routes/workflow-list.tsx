import { createFileRoute } from '@tanstack/react-router';
import { AuthGuard } from '@/src/app/components/guards/auth-guard';
import { PermissionGuard } from '@/src/app/components/guards/permission-guard';
import WorkflowList from '@/src/app/components/workflows/workflow-list';
import { useAuth } from '../contexts/AuthContext';

export const Route = createFileRoute('/workflow-list')({
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
				<h1>Workflow List</h1>
				<WorkflowList />
			</PermissionGuard>
		</AuthGuard>
	);
}
