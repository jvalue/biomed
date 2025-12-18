import { createFileRoute } from '@tanstack/react-router';
import WorkflowTemplatesList from '@/src/app/components/workflow-templates/workflow-templates-list';

export const Route = createFileRoute('/workflow-templates')({
	component: () => (
		<div>
			<h1>Workflow Templates</h1>
			<WorkflowTemplatesList />
		</div>
	),
});
