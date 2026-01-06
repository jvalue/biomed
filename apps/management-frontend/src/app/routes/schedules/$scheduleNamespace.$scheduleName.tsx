import { Can } from '@casl/react';
import { createFileRoute } from '@tanstack/react-router';
// biome-ignore lint/correctness/noUnusedImports: <is used>
import React from 'react';
import { useScheduleByNameAndNamespace } from '@/src/app/api/hooks/useSchedules';
import CrawlerRunsTable from '@/src/app/components/crawler-runs/crawler-runs-table';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/src/app/components/design-components/card';
import { Spinner } from '@/src/app/components/design-components/spinner';
import { PermissionGuard } from '@/src/app/components/guards/permission-guard';
import { useAuth } from '@/src/app/contexts/AuthContext';
import { formatCronReadable, getNextRunDate } from '@/src/app/utils/cron';
import { Badge } from '../../components/design-components/badge';
import { AuthGuard } from '../../components/guards/auth-guard';
import { validatePageSearch } from '../../utils/validate-page-search';

export const Route = createFileRoute('/schedules/$scheduleNamespace/$scheduleName')({
	validateSearch: validatePageSearch,
	component: RouteComponent,
});

function RouteComponent() {
	const { ability } = useAuth();
	const { scheduleNamespace, scheduleName } = Route.useParams();

	const search = Route.useSearch();
	const page = search.page ?? 1;

	const navigate = Route.useNavigate();
	const setPage = (nextPage: number) => {
		const p = Math.max(1, nextPage);
		navigate({
			search: (prev: { page?: number }) => ({
				...prev,
				// omit from URL on page 1
				page: p >= 2 ? p : undefined,
			}),
		});
	};

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

						<Card className="shadow-sm">
							<CardHeader className="pb-3">
								<CardDescription className="text-xs uppercase tracking-wide">
									Cron Schedule
								</CardDescription>
								<CardTitle className="text-lg">
									{schedule?.schedule ? formatCronReadable(schedule.schedule) : '-'}
								</CardTitle>
							</CardHeader>
							{schedule?.schedule && !suspended && (
								<CardContent className="text-xs text-muted-foreground">
									Next Run: {nextRun ? nextRun.toLocaleString() : 'invalid cron expression'}
								</CardContent>
							)}
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

					<Card className="shadow-lg">
						<CardHeader className="border-b">
							<CardTitle className="text-xl">Parameters</CardTitle>
							<CardDescription>Configured parameters for this schedule</CardDescription>
						</CardHeader>
						<CardContent className="pt-6">
							{schedule?.parameters && schedule.parameters.length > 0 ? (
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
									{schedule.parameters.map((p) => (
										<div
											key={p.name}
											className="px-4 py-2 rounded-md bg-gray-100 border border-gray-200 text-sm"
										>
											<span className="font-semibold text-gray-900">{p.name}:</span>{' '}
											<span className="text-gray-700">{p.value}</span>
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-muted-foreground">No parameters configured</p>
							)}
						</CardContent>
					</Card>

					<Can ability={ability} I="read" a="crawler-run">
						<Card className="shadow-lg">
							<CardHeader className="border-b">
								<CardTitle className="text-xl">Crawler Runs</CardTitle>
								<CardDescription>All crawler runs triggered by this schedule</CardDescription>
							</CardHeader>
							<CardContent className="pt-6">
								<CrawlerRunsTable page={page} setPage={setPage} scheduleName={scheduleName} />
							</CardContent>
						</Card>
					</Can>
				</div>
			</PermissionGuard>
		</AuthGuard>
	);
}
