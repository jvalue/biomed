import { Button } from '@/src/app/components/design-components/button';
import WorkflowRunsTable from '@/src/app/components/workflows/workflow-runs-table';
import { useWorkflowRuns } from '../../api/hooks/useWorkflowRuns';

export default function WorkflowListComponent() {
	const { data, isLoading, error, refetch } = useWorkflowRuns();

	if (isLoading) return <div>Laden...</div>;
	if (error) return <div>Fehler: {error.message}</div>;

	return (
		<div>
			<Button variant={'default'} size={'sm'} onClick={() => refetch()}>
				Aktualisieren
			</Button>
			<WorkflowRunsTable runs={data}></WorkflowRunsTable>
		</div>
	);
}
