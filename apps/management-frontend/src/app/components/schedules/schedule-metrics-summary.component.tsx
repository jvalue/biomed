import { useScheduleMetricsSummary } from '@/src/app/api/hooks/useScheduleMetrics';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/src/app/components/design-components/card';
import { Spinner } from '@/src/app/components/design-components/spinner';

interface ScheduleMetricsSummaryProps {
	scheduleName: string;
	scheduleNamespace: string;
}

export default function ScheduleMetricsSummaryComponent({
	scheduleName,
	scheduleNamespace,
}: ScheduleMetricsSummaryProps) {
	const {
		data: metrics,
		isLoading,
		error,
	} = useScheduleMetricsSummary(scheduleName, scheduleNamespace);

	if (isLoading) {
		return (
			<Card className="shadow-sm">
				<CardHeader className="pb-3">
					<CardTitle className="text-xl">Metrics Overview</CardTitle>
					<CardDescription>Overall statistics across all crawler runs</CardDescription>
				</CardHeader>
				<CardContent className="flex items-center justify-center min-h-[120px]">
					<Spinner className="size-8" />
				</CardContent>
			</Card>
		);
	}

	if (error || !metrics || metrics.totalCrawledDataSets === 0) {
		return (
			<Card className="shadow-sm">
				<CardHeader className="pb-3">
					<CardTitle className="text-xl">Metrics Overview</CardTitle>
					<CardDescription>Overall statistics across all crawler runs</CardDescription>
				</CardHeader>
				<CardContent className="text-sm text-muted-foreground">
					{error ? 'Failed to load metrics' : 'No metrics available'}
				</CardContent>
			</Card>
		);
	}

	const percentageFormatted = (metrics.totalNewDataSetsPercentage * 100).toFixed(1);

	return (
		<Card className="shadow-sm">
			<CardHeader className="pb-3">
				<CardTitle className="text-xl">Metrics Overview</CardTitle>
				<CardDescription>Overall statistics across all crawler runs</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
					<div className="space-y-1">
						<p className="text-xs text-muted-foreground uppercase tracking-wide">
							Total Datasets Crawled
						</p>
						<p className="text-2xl font-bold text-primary">{metrics.totalCrawledDataSets}</p>
					</div>

					<div className="space-y-1">
						<p className="text-xs text-muted-foreground uppercase tracking-wide">New Datasets</p>
						<p className="text-2xl font-bold text-green-600">{metrics.totalNewDataSets}</p>
					</div>

					<div className="space-y-1">
						<p className="text-xs text-muted-foreground uppercase tracking-wide">
							New Datasets Rate
						</p>
						<p className="text-2xl font-bold text-blue-600">{percentageFormatted}%</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
