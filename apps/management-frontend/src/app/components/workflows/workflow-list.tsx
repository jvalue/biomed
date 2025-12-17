import { Spinner } from '@/src/app/components/design-components/spinner';
import WorkflowRunsTable from '@/src/app/components/workflows/workflow-runs-table';
import { useWorkflowRuns } from '../../api/hooks/useWorkflowRuns';

export default function WorkflowList() {
	const { data, isLoading, error } = useWorkflowRuns();

	if (isLoading)
		return (
			<div className="col-span-12 flex justify-center pt-6">
				<Spinner className="size-10" />
			</div>
		);

	if (error) return <div>An error occurred: {error.message}</div>;

	return (
		<div>
			<p>
				In the following table you can see all runs (finished and still running) sorted by starting
				date.
			</p>
			<WorkflowRunsTable runs={data?.data}></WorkflowRunsTable>
		</div>
	);
}
