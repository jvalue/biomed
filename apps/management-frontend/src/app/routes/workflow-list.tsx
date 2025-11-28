import WorkflowListComponent from '../components/workflows/workflow-list.component';

export default function WorkflowList() {
	return (
		<div>
			<h2>Workflow List</h2>
			<p>Shows all currently running workflows</p>
			<WorkflowListComponent></WorkflowListComponent>
		</div>
	);
}
