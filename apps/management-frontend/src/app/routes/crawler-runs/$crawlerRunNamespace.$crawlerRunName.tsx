import { createFileRoute } from '@tanstack/react-router';
import { useCrawlerRun } from '@/src/app/api/hooks/useCrawlerRun';
import {
	useCrawlerRunEvents,
	useCrawlerRunMetrics,
} from '@/src/app/api/hooks/useCrawlerRunMetrics';
import { RunEventsSectionComponent } from '@/src/app/components/crawler-runs/run-events-section.component';
import { RunInfoCardsComponent } from '@/src/app/components/crawler-runs/run-info-cards.component';
import { RunMetricsSectionComponent } from '@/src/app/components/crawler-runs/run-metrics-section.component';
import { Badge } from '@/src/app/components/design-components/badge';
import ParameterSectionComponent from '@/src/app/components/design-components/parameterSection.component';
import { Spinner } from '@/src/app/components/design-components/spinner';
import { getPhaseClass } from '../../components/crawler-runs/utils/get-phase-class';

export const Route = createFileRoute('/crawler-runs/$crawlerRunNamespace/$crawlerRunName')({
	component: RouteComponent,
});

function RouteComponent() {
	const { crawlerRunNamespace, crawlerRunName } = Route.useParams();
	const {
		data: run,
		isLoading: isLoadingRun,
		error: runError,
	} = useCrawlerRun(crawlerRunNamespace, crawlerRunName);
	const {
		data: metrics,
		isLoading: isLoadingMetrics,
		error: metricsError,
	} = useCrawlerRunMetrics(crawlerRunNamespace, crawlerRunName, run?.phase);
	const {
		data: events,
		isLoading: isLoadingEvents,
		error: eventsError,
	} = useCrawlerRunEvents(crawlerRunNamespace, crawlerRunName, run?.phase);

	const durationSeconds =
		run?.finishedAt && run?.startedAt
			? Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
			: undefined;

	if (isLoadingRun) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<Spinner className="size-10" />
			</div>
		);
	}

	if (runError || !run) {
		return (
			<div className="text-red-600">
				Error loading crawler run: {runError?.message ?? 'Unknown error'}
			</div>
		);
	}

	return (
		<div className="grid gap-8">
			<div className="flex flex-col md:flex-row justify-between items-start gap-4">
				<div>
					<h1>{run.name}</h1>
					<div className="mt-2 flex items-center gap-2">
						<Badge variant="outline" className="text-xs font-medium">
							{run.namespace}
						</Badge>
						<Badge className={`text-xs font-medium ${getPhaseClass(run.phase)}`}>{run.phase}</Badge>
					</div>
				</div>
			</div>

			<RunInfoCardsComponent
				namespace={run.namespace}
				crawlerTemplateName={run.crawlerTemplateName}
				scheduleName={run.scheduleName}
				startedAt={run.startedAt}
				finishedAt={run.finishedAt}
			/>

			<ParameterSectionComponent parameters={run.parameters} />

			<RunMetricsSectionComponent
				durationSeconds={durationSeconds}
				metrics={metrics}
				isLoading={isLoadingMetrics}
				error={metricsError}
			/>

			<RunEventsSectionComponent events={events} isLoading={isLoadingEvents} error={eventsError} />
		</div>
	);
}
