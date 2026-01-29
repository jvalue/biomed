import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../design-components/card';
import { Progress } from '../design-components/progress';
import { Spinner } from '../design-components/spinner';

interface MetricsData {
	progress?: number;
	crawledDataSets?: number;
	cacheHits?: number;
}

interface RunMetricsSectionProps {
	durationSeconds?: number;
	metrics?: MetricsData;
	isLoading: boolean;
	error: Error | null;
}

export function RunMetricsSectionComponent({
	durationSeconds,
	metrics,
	isLoading,
	error,
}: RunMetricsSectionProps) {
	if (isLoading) {
		return (
			<Card className="shadow-lg">
				<CardHeader className="border-b">
					<CardTitle className="text-xl">Metrics</CardTitle>
					<CardDescription>Performance and progress metrics for this run</CardDescription>
				</CardHeader>
				<CardContent className="pt-6">
					<div className="flex justify-center py-8">
						<Spinner className="size-8" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error || !metrics) {
		return (
			<Card className="shadow-lg">
				<CardHeader className="border-b">
					<CardTitle className="text-xl">Metrics</CardTitle>
					<CardDescription>Performance and progress metrics for this run</CardDescription>
				</CardHeader>
				<CardContent className="pt-6">
					<p className="text-sm text-muted-foreground py-4">No metrics available</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="shadow-lg">
			<CardHeader className="border-b">
				<CardTitle className="text-xl">Metrics</CardTitle>
				<CardDescription>Performance and progress metrics for this run</CardDescription>
			</CardHeader>
			<CardContent className="pt-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
					{(metrics.progress || metrics.progress === 0) && (
						<div>
							<p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
								Discovery Progress
							</p>
							<div className="flex items-center gap-3">
								<Progress
									value={metrics.progress}
									className="bg-muted"
									color={metrics.progress === 100 ? 'bg-green-800' : 'bg-primary'}
								/>
								<p
									className={`text-md font-medium ${metrics.progress === 100 ? 'text-green-800' : 'text-primary'}`}
								>
									{metrics.progress}%
								</p>
							</div>
						</div>
					)}
					{/*Dummy data for download progress*/}
					<div className="pb-2">
						<p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
							Download Progress
						</p>
						<div className="flex items-center gap-3">
							<Progress value={0} className="bg-muted" />
							<p className="text-md font-medium text-primary">0%</p>
						</div>
					</div>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{(metrics.crawledDataSets || metrics.crawledDataSets === 0) && (
						<div>
							<p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
								Crawled Data Sets
							</p>
							<p className="text-xl font-semibold">{metrics.crawledDataSets}</p>
						</div>
					)}
					{(metrics.cacheHits || metrics.cacheHits === 0) && (
						<div>
							<p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
								Cache Hits
							</p>
							<p className="text-xl font-semibold">{metrics.cacheHits}</p>
						</div>
					)}
					{durationSeconds &&
						durationSeconds !== 0 &&
						(metrics.crawledDataSets || metrics.crawledDataSets === 0) && (
							<div>
								<p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
									Data Sets per Second
								</p>
								<p className="text-xl font-semibold">
									{(metrics.crawledDataSets / durationSeconds).toFixed(2)}
								</p>
							</div>
						)}
					{(metrics.crawledDataSets || metrics.crawledDataSets === 0) &&
						(metrics.cacheHits || metrics.cacheHits === 0) && (
							<div>
								<p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
									New discovered Data Sets
								</p>
								<p className="text-xl font-semibold text-primary">
									{metrics.crawledDataSets - metrics.cacheHits}
								</p>
							</div>
						)}
				</div>
			</CardContent>
		</Card>
	);
}
