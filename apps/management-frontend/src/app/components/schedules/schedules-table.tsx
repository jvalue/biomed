import { ScheduleDto } from '@/src/app/api/dto/schedule/schedule.dto';
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/src/app/components/design-components/table';

export interface ScheduleTableProps {
	schedules?: ScheduleDto[];
}

export default function SchedulesTable({ schedules = [] }: ScheduleTableProps) {
	return (
		<Table className="m-4 mt-6">
			<TableCaption>Schedules</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead className="text-primary">Name</TableHead>
					<TableHead className="text-primary">Workflow Template Name</TableHead>
					<TableHead className="text-primary">Namespace</TableHead>
					<TableHead className="text-primary">Schedule</TableHead>
					<TableHead className="text-primary">Suspended</TableHead>
					<TableHead className="text-primary">Created at</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{schedules.map((template) => (
					<TableRow key={template.name}>
						<TableCell>{template.name}</TableCell>
						<TableCell>{template.workflowTemplateName}</TableCell>
						<TableCell>{template.namespace}</TableCell>
						<TableCell>{template.schedule}</TableCell>
						<TableCell>{template.suspended ? 'Yes' : 'No'}</TableCell>
						<TableCell>{new Date(template.createdAt).toLocaleString()}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
