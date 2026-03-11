import { useRouter } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/src/app/components/design-components/tooltip';
import { formatCronReadable, getNextRunDate } from '@/src/app/utils/cron';

export interface ScheduleTableProps {
	schedules?: ScheduleDto[];
}

export default function SchedulesTable({ schedules = [] }: ScheduleTableProps) {
	const router = useRouter();

	return (
		<div className="p-4 pt-6 overflow-x-auto">
			<Table>
				<TableCaption>Schedules</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead className="text-primary">
							Name <span className="block text-xs font-normal invisible">placeholder</span>
						</TableHead>
						<TableHead className="text-primary">&nbsp;</TableHead>
						<TableHead className="text-primary">
							Crawler Name <span className="block text-xs font-normal invisible">placeholder</span>
						</TableHead>
						<TableHead className="text-primary">
							Namespace <span className="block text-xs font-normal invisible">placeholder</span>
						</TableHead>
						<TableHead className="text-primary">
							Schedule{' '}
							<span className="block text-xs font-normal text-muted-foreground">
								(schedule timezone)
							</span>
						</TableHead>
						<TableHead className="text-primary">
							Next Run{' '}
							<span className="block text-xs font-normal text-muted-foreground">(local time)</span>
						</TableHead>
						<TableHead className="text-primary">
							Created at{' '}
							<span className="block text-xs font-normal text-muted-foreground">(local time)</span>
						</TableHead>
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
							{/* Error indicator column */}
							<TableCell>
								{schedule.activeErrors && Object.keys(schedule.activeErrors).length > 0 && (
									<Tooltip>
										<TooltipTrigger asChild>
											<AlertTriangle className="w-5 h-5 text-yellow-600" />
										</TooltipTrigger>
										<TooltipContent side="bottom">
											<div className="max-w-xs">
												<p className="font-semibold">Schedule errors</p>
												<p className="text-sm mt-1">
													This schedule has errors — click the schedule row to view details.
												</p>
											</div>
										</TooltipContent>
									</Tooltip>
								)}
							</TableCell>
							<TableCell>{schedule.crawlerTemplateName}</TableCell>
							<TableCell>{schedule.namespace}</TableCell>
							<TableCell>
								<span>{formatCronReadable(schedule.schedule, schedule.timezone)}</span>
							</TableCell>
							<TableCell className={schedule.suspended ? 'text-muted-foreground' : ''}>
								{schedule.suspended
									? 'Suspended'
									: (getNextRunDate(schedule.schedule, schedule.timezone)?.toLocaleString() ??
										'invalid cron expression')}
							</TableCell>
							<TableCell>{new Date(schedule.createdAt).toLocaleString()}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
