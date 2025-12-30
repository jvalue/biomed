import { useRouter } from '@tanstack/react-router';
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
import { formatCronReadable, getNextRunDate } from '@/src/app/utils/cron';

export interface ScheduleTableProps {
	schedules?: ScheduleDto[];
}

export default function SchedulesTable({ schedules = [] }: ScheduleTableProps) {
	const router = useRouter();

	return (
		<Table className="m-4 mt-6">
			<TableCaption>Schedules</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead className="text-primary">Name</TableHead>
					<TableHead className="text-primary">Crawler Name</TableHead>
					<TableHead className="text-primary">Namespace</TableHead>
					<TableHead className="text-primary">Schedule</TableHead>
					<TableHead className="text-primary">Next Run</TableHead>
					<TableHead className="text-primary">Created at</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{schedules.map((schedule) => (
					<TableRow
						key={`${schedule.namespace}-${schedule.name}`}
						className="cursor-pointer hover:bg-gray-100"
						onClick={() =>
							router.navigate({ to: `/schedules/${schedule.namespace}/${schedule.name}` })
						}
					>
						<TableCell>{schedule.name}</TableCell>
						<TableCell>{schedule.crawlerTemplateName}</TableCell>
						<TableCell>{schedule.namespace}</TableCell>
						<TableCell>{formatCronReadable(schedule.schedule)}</TableCell>
						<TableCell className={schedule.suspended ? 'text-muted-foreground' : ''}>
							{schedule.suspended
								? 'Suspended'
								: (getNextRunDate(schedule.schedule)?.toLocaleString() ??
									'invalid cron expression')}
						</TableCell>
						<TableCell>{new Date(schedule.createdAt).toLocaleString()}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
