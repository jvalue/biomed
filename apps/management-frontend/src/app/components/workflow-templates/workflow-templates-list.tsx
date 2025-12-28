import { useWorkflowTemplates } from '@/src/app/api/hooks/useWorkflowTemplates';
import { Spinner } from '@/src/app/components/design-components/spinner';
import WorkflowTemplatesTable from '@/src/app/components/workflow-templates/workflow-templates-table';

export default function WorkflowTemplatesList() {
	const { data, isLoading, error } = useWorkflowTemplates();

	if (isLoading) {
		return (
			<div className="col-span-12 flex justify-center pt-6">
				<Spinner className="size-10" />
			</div>
		);
	}

	if (error) return <div>An error occurred: {error.message}</div>;

	return (
		<div>
			<p>
				In the following table you can see all workflow templates and submit runs for those. If you
				cannot see the start run button, you don't have the permission to start runs.
			</p>
			<WorkflowTemplatesTable templates={data} />
		</div>
	);
}
