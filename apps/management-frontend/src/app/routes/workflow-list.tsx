import { createFileRoute } from '@tanstack/react-router';
import WorkflowListComponent from '../components/workflows/workflow-list.component';

export const Route = createFileRoute('/workflow-list')({
	component: () => (
		<div>
			<h2>Workflow List</h2>
			<p>Shows all currently running workflows</p>
			<WorkflowListComponent />
		</div>
	),
});
