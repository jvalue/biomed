import { Can } from '@casl/react';
import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import { toast } from 'react-toastify';
import {
	useDeleteSchedule,
	useResumeSchedule,
	useScheduleByNameAndNamespace,
	useSuspendSchedule,
} from '@/src/app/api/hooks/useSchedules';
import CrawlerRunsTable from '@/src/app/components/crawler-runs/crawler-runs-table';
import { Button } from '@/src/app/components/design-components/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/src/app/components/design-components/card';
import ParameterSectionComponent from '@/src/app/components/design-components/parameterSection.component';
import { Spinner } from '@/src/app/components/design-components/spinner';
import { PermissionGuard } from '@/src/app/components/guards/permission-guard';
import DeleteScheduleDialogComponent from '@/src/app/components/schedules/delete-schedule-dialog.component';
import ScheduleConfigurationSectionComponent from '@/src/app/components/schedules/scheduleConfigurationSection.component';
import { useAuth } from '@/src/app/contexts/AuthContext';
import { formatCronReadable, getNextRunDate } from '@/src/app/utils/cron';
import { Badge } from '../../components/design-components/badge';
import { Switch } from '../../components/design-components/switch';
import { AuthGuard } from '../../components/guards/auth-guard';
import { validatePageSearch } from '../../utils/validate-page-search';

export const Route = createFileRoute('/schedules/$scheduleNamespace/$scheduleName')({
	validateSearch: validatePageSearch,
	component: RouteComponent,
});

function RouteComponent() {
	const { ability } = useAuth();
	const { scheduleNamespace, scheduleName } = Route.useParams();
	const suspendSchedule = useSuspendSchedule();
	const resumeSchedule = useResumeSchedule();
	const deleteSchedule = useDeleteSchedule();

	const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

	const handleToggleSuspend = () => {
		if (suspended) {
			resumeSchedule.mutate({ name: scheduleName, namespace: scheduleNamespace });
		} else {
			suspendSchedule.mutate({ name: scheduleName, namespace: scheduleNamespace });
		}
	};

	const search = Route.useSearch();
	const page = search.page ?? 1;

	const navigate = Route.useNavigate();
	const setPage = React.useCallback(
		(nextPage: number, opts?: { scrollToTable?: boolean }) => {
			const p = Math.max(1, nextPage);

			navigate({
				search: (prev: { page?: number }) => ({
					...prev,
					page: p >= 2 ? p : undefined,
				}),
				resetScroll: !(opts?.scrollToTable === true),
			});
		},
		[navigate],
	);

	const {
		data: schedule,
		isLoading: scheduleQueryIsLoading,
		error: scheduleQueryError,
	} = useScheduleByNameAndNamespace(scheduleName, scheduleNamespace);

	if (scheduleQueryIsLoading) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<Spinner className="size-10" />
			</div>
		);
	}
	if (scheduleQueryError) {
		return (
			<div className="text-red-600">Error loading schedules: {scheduleQueryError.message}</div>
		);
	}

	const suspended = schedule?.suspended ?? false;
	const nextRun = schedule?.schedule ? getNextRunDate(schedule.schedule) : null;
	const createdAt = schedule?.createdAt ? new Date(schedule.createdAt).toLocaleString() : '-';
	const stats = schedule?.statistics;

	return (
		<AuthGuard>
			<PermissionGuard
				ability={ability}
				required={[
					{
						action: 'read',
						subject: 'schedule',
						label: 'read schedules',
					},
					{
						action: 'read',
						subject: 'crawler-template',
						label: 'read crawler templates',
					},
				]}
			>
				<div className="grid gap-8">
					<div className="flex flex-col md:flex-row justify-between items-start gap-4">
						<div>
							<h1>{scheduleName}</h1>
							<div className="mt-2 flex items-center gap-2">
								<Badge variant="outline" className="text-xs font-medium">
									{scheduleNamespace}
								</Badge>
								<Badge
									className={
										suspended
											? 'bg-muted text-gray-700 border text-xs font-medium'
											: 'bg-green-100 text-green-800 border border-green-300 text-xs font-medium'
									}
								>
									{suspended ? 'Suspended' : 'Active'}
								</Badge>
							</div>
						</div>

						<Can ability={ability} I="update" a="schedule">
							<div className="flex items-center gap-3">
								<span className="text-md font-semibold text-muted-foreground">
									{suspended ? 'Suspended' : 'Active'}
								</span>
								<Switch
									checked={!suspended}
									onCheckedChange={handleToggleSuspend}
									disabled={suspendSchedule.isPending || resumeSchedule.isPending}
									size={'large'}
								/>
								{/* Delete button with permission check */}
								<Can ability={ability} I="delete" a="schedule">
									<Button
										variant="destructive"
										onClick={() => setDeleteDialogOpen(true)}
										disabled={deleteSchedule.isPending}
										className="ml-2 bg-red-600 hover:bg-red-700"
									>
										Delete
									</Button>
								</Can>
							</div>
						</Can>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
						<Card className="shadow-sm">
							<CardHeader className="pb-3">
								<CardDescription className="text-xs uppercase tracking-wide">
									Crawler:
								</CardDescription>
								<CardTitle className="text-primary text-xl">
									{schedule?.crawlerTemplateName ?? '-'}
								</CardTitle>
							</CardHeader>
						</Card>

						<Card className="shadow-sm min-h-[120px] flex flex-col">
							<CardHeader className="pb-3 flex-1">
								<CardDescription className="text-xs uppercase tracking-wide">
									Cron Schedule
								</CardDescription>
								<CardTitle className="text-lg">
									{schedule?.schedule ? formatCronReadable(schedule.schedule) : '-'}
								</CardTitle>
							</CardHeader>
							<CardContent className="text-xs text-muted-foreground pb-4">
								{schedule?.schedule && !suspended ? (
									<>Next Run: {nextRun ? nextRun.toLocaleString() : 'invalid cron expression'}</>
								) : (
									<span className="invisible">Placeholder</span>
								)}
							</CardContent>
						</Card>

						<Card className="shadow-sm">
							<CardHeader className="pb-3">
								<CardDescription className="text-xs uppercase tracking-wide">
									Created At
								</CardDescription>
								<CardTitle className="text-lg">{createdAt}</CardTitle>
							</CardHeader>
						</Card>

						<Card className="shadow-sm">
							<CardHeader className="pb-3">
								<CardDescription className="text-xs uppercase tracking-wide">
									Successful Runs / Failed Runs
								</CardDescription>
								<CardTitle className="text-lg">
									<span className="text-green-600">{stats?.successfulRuns ?? '-'}</span> /{' '}
									<span className="text-red-600">{stats?.failedRuns ?? '-'}</span>
								</CardTitle>
							</CardHeader>
						</Card>
					</div>

					<ParameterSectionComponent parameters={schedule?.parameters} />

					<ScheduleConfigurationSectionComponent retryStrategy={schedule?.retryStrategy} />

					<Can ability={ability} I="read" a="crawler-run">
						<Card className="shadow-lg">
							<CardHeader className="border-b">
								<CardTitle className="text-xl">Crawler Runs</CardTitle>
								<CardDescription>All crawler runs triggered by this schedule</CardDescription>
							</CardHeader>
							<CardContent className="pt-6">
								<CrawlerRunsTable
									page={page}
									setPage={setPage}
									scheduleName={scheduleName}
									scrollOnPaginate
								/>
							</CardContent>
						</Card>
					</Can>

					<DeleteScheduleDialogComponent
						open={deleteDialogOpen}
						onOpenChange={setDeleteDialogOpen}
						scheduleName={scheduleName}
						scheduleNamespace={scheduleNamespace}
						onDeleted={() => {
							navigate({ to: '/schedules' });
							toast.success(`Schedule ${scheduleName} deleted successfully`);
						}}
					/>
				</div>
			</PermissionGuard>
		</AuthGuard>
	);
}
