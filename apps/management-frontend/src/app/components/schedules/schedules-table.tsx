import { Can } from '@casl/react';
import { useRouter } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import { HealthStatusEnum } from '@/src/app/api/dto/health/healthStatus.enum';
import { TargetUrlStatusDto } from '@/src/app/api/dto/health/targets/targetUrlStatus.dto';
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
import { formatTargetWarningsSummary } from '@/src/app/components/schedules/utils/formatTargetWarningsSummary';
import { useAuth } from '@/src/app/contexts/AuthContext';
import { formatCronReadable, getCronLocalTimeHint, getNextRunDate } from '@/src/app/utils/cron';

export interface ScheduleTableProps {
	schedules?: ScheduleDto[];
	targetHealth?: TargetUrlStatusDto[];
}

function getScheduleKey(namespace: string, name: string) {
	return `${namespace}::${name}`;
}

export default function SchedulesTable({ schedules = [], targetHealth = [] }: ScheduleTableProps) {
	const router = useRouter();
	const { ability } = useAuth();

	const targetWarningsBySchedule = useMemo(() => {
		const map: Record<string, TargetUrlStatusDto[]> = {};

		if (!targetHealth) return map;

		for (const targetStatus of targetHealth) {
			if (targetStatus.status === HealthStatusEnum.AVAILABLE) continue;

			for (const schedule of targetStatus.target.schedules ?? []) {
				const key = getScheduleKey(schedule.namespace, schedule.name);

				if (!map[key]) {
					map[key] = [];
				}

				map[key].push(targetStatus);
			}
		}

		return map;
	}, [targetHealth]);

	return (
		<div className="p-4 pt-6 overflow-x-auto">
			<Table>
				<TableCaption>Schedules</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead className="text-primary">
							Name{' '}
							<span className="block text-xs font-normal invisible" aria-hidden="true">
								placeholder
							</span>
						</TableHead>
						<TableHead className="text-primary">&nbsp;</TableHead>
						<TableHead className="text-primary" aria-hidden="true">
							Crawler Name{' '}
							<span className="block text-xs font-normal invisible" aria-hidden="true">
								placeholder
							</span>
						</TableHead>
						<TableHead className="text-primary" aria-hidden="true">
							Namespace <span className="block text-xs font-normal invisible">placeholder</span>
						</TableHead>
						<TableHead className="text-primary">
							Schedule
							<span className="block text-xs font-normal text-muted-foreground">
								(schedule timezone)
							</span>
						</TableHead>
						<TableHead className="text-primary">
							Next Run
							<span className="block text-xs font-normal text-muted-foreground">(local time)</span>
						</TableHead>
						<TableHead className="text-primary">
							Created at
							<span className="block text-xs font-normal text-muted-foreground">(local time)</span>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{schedules.map((schedule) => {
						const cronLocalHint = getCronLocalTimeHint(schedule.schedule);
						const targetWarnings =
							targetWarningsBySchedule[getScheduleKey(schedule.namespace, schedule.name)] ?? [];
						const hasScheduleErrors =
							!!schedule.activeErrors && Object.keys(schedule.activeErrors).length > 0;
						const hasTargetWarnings = targetWarnings.length > 0;

						return (
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
									<div className="flex items-center gap-1">
										{hasScheduleErrors && (
											<Tooltip>
												<TooltipTrigger asChild>
													<AlertTriangle className="w-5 h-5 text-red-600" />
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
										<Can ability={ability} I="read" a="health">
											{hasTargetWarnings && (
												<Tooltip>
													<TooltipTrigger asChild>
														<AlertTriangle className="w-5 h-5 text-yellow-600" />
													</TooltipTrigger>
													<TooltipContent side="bottom">
														<div className="max-w-xs">
															<p className="font-semibold">Target warnings</p>
															<p className="text-sm mt-1">
																{formatTargetWarningsSummary(targetWarnings)}
															</p>
														</div>
													</TooltipContent>
												</Tooltip>
											)}
										</Can>
									</div>
								</TableCell>

								<TableCell>{schedule.crawlerTemplateName}</TableCell>
								<TableCell>{schedule.namespace}</TableCell>
								<TableCell>
									<Tooltip>
										<TooltipTrigger asChild>
											<span>{formatCronReadable(schedule.schedule)}</span>
										</TooltipTrigger>
										{cronLocalHint && (
											<TooltipContent side="bottom">
												<p>{cronLocalHint}</p>
											</TooltipContent>
										)}
									</Tooltip>
								</TableCell>
								<TableCell className={schedule.suspended ? 'text-muted-foreground' : ''}>
									{schedule.suspended
										? 'Suspended'
										: (getNextRunDate(schedule.schedule)?.toLocaleString() ??
											'invalid cron expression')}
								</TableCell>
								<TableCell>{new Date(schedule.createdAt).toLocaleString()}</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
