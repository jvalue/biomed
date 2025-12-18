import { createFileRoute } from '@tanstack/react-router';
import { AuthGuard } from '@/src/app/components/guards/auth-guard';
import { PermissionGuard } from '@/src/app/components/guards/permission-guard';
import WorkflowTemplatesList from '@/src/app/components/workflow-templates/workflow-templates-list';
import { useAuth } from '../contexts/AuthContext';

export const Route = createFileRoute('/workflow-templates')({
	component: RouteComponent,
});

function RouteComponent() {
	const { ability } = useAuth();
	return (
		<AuthGuard>
			<PermissionGuard
				ability={ability}
				required={[{ action: 'read', subject: 'template', label: 'read templates' }]}
			>
				<h1>Workflow Templates</h1>
				<WorkflowTemplatesList />
			</PermissionGuard>
		</AuthGuard>
	);
}
