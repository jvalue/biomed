import { Button } from '@/src/app/components/design-components/button';
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
			{data?.items?.map((workflow: any) => (
				<div key={workflow.metadata.name}>{workflow.metadata.name}</div>
			))}
		</div>
	);
}
