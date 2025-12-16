import { createFileRoute } from '@tanstack/react-router';
import { AuthGuard } from '@/src/app/components/guards/auth-guard';
import WorkflowList from '../components/workflows/workflow-list';

export const Route = createFileRoute('/workflow-list')({
	component: () => (
		<AuthGuard>
			<div>
				<h1>Workflow List</h1>
				<WorkflowList />
			</div>
		</AuthGuard>
	),
});
