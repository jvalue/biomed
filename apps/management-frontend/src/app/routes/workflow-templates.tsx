import { createFileRoute } from '@tanstack/react-router';
import { AuthGuard } from '@/src/app/components/auth-guard';
import WorkflowTemplatesList from '@/src/app/components/workflow-templates/workflow-templates-list';

export const Route = createFileRoute('/workflow-templates')({
	component: () => (
		<AuthGuard>
			<div>
				<h1>Workflow Templates</h1>
				<WorkflowTemplatesList />
			</div>
		</AuthGuard>
	),
});
