import { WorkflowRunDto } from '@/src/app/api/dto/workflow/workflow-run.dto';
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/src/app/components/design-components/table';

export interface WorkflowRunsTableProps {
	runs?: WorkflowRunDto[];
}

export default function WorkflowRunsTable({ runs = [] }: WorkflowRunsTableProps) {
	return (
		<Table>
			<TableCaption>Currently running workflow runs.</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead>Name/ID</TableHead>
					<TableHead>Namespace</TableHead>
					<TableHead>Workflow Template</TableHead>
					<TableHead>Phase</TableHead>
					<TableHead>Started at</TableHead>
					<TableHead>Finished at</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{runs.map((run) => (
					<TableRow key={run.name}>
						<TableCell>{run.name}</TableCell>
						<TableCell>{run.namespace}</TableCell>
						<TableCell>{run.workflowTemplateName}</TableCell>
						<TableCell>{run.phase}</TableCell>
						<TableCell>
							{run.startedAt ? new Date(run.startedAt).toLocaleString() : 'not yet started'}
						</TableCell>
						<TableCell>
							{run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '-'}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
