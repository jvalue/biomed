import { useWorkflowRuns } from '../../api/hooks/useWorkflowRuns';

export default function WorkflowListComponent() {
	const { data, isLoading, error, refetch } = useWorkflowRuns();

	if (isLoading) return <div>Laden...</div>;
	if (error) return <div>Fehler: {error.message}</div>;

	return (
		<div>
			<button type={'button'} onClick={() => refetch()}>
				Aktualisieren
			</button>
			{data?.items?.map((workflow: any) => (
				<div key={workflow.metadata.name}>{workflow.metadata.name}</div>
			))}
		</div>
	);
}
