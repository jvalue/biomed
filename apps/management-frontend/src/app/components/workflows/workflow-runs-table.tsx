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
		<Table className="m-4 mt-6">
			<TableCaption>Currently running workflow runs.</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead className="text-primary">Name/ID</TableHead>
					<TableHead className="text-primary">Namespace</TableHead>
					<TableHead className="text-primary">Workflow Template</TableHead>
					<TableHead className="text-primary">Schedule</TableHead>
					<TableHead className="text-primary">Phase</TableHead>
					<TableHead className="text-primary">Started at</TableHead>
					<TableHead className="text-primary">Finished at</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{runs.map((run) => (
					<TableRow key={run.name}>
						<TableCell>{run.name}</TableCell>
						<TableCell>{run.namespace}</TableCell>
						<TableCell>{run.workflowTemplateName}</TableCell>
						<TableCell>{run.scheduleName ?? '-'}</TableCell>
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
