import { Globe, RefreshCw } from 'lucide-react';
import { useTargetUrlsHealthCheck } from '@/src/app/api/hooks/useHealthCheck';
import { Button } from '@/src/app/components/design-components/button';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/src/app/components/design-components/card';
import { Spinner } from '@/src/app/components/design-components/spinner';
import { HealthStatusEnum } from '../../api/dto/health/healthStatus.enum';
import { TargetUrlStatusDto } from '../../api/dto/health/targetUrlStatus.dto';
import { getHostnameSafe, getStatusBadge, getStatusColor, getStatusIcon } from './health-utils';

export default function CrawlerTargetsComponent() {
	const {
		data: targetUrlsHealthStatus,
		isLoading,
		isFetching,
		error,
		refetch,
		dataUpdatedAt,
	} = useTargetUrlsHealthCheck();

	const lastChecked = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString() : 'Never';

	return (
		<div>
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-2xl font-semibold flex items-center gap-2">
					<Globe className="w-6 h-6" />
					Crawler Targets
				</h2>
				<div className="flex items-center gap-4">
					<div className="text-sm text-muted-foreground">Last checked: {lastChecked}</div>
					<Button
						size="sm"
						type="button"
						onClick={() => refetch()}
						className="flex items-center gap-2"
						disabled={isLoading || isFetching}
					>
						<RefreshCw className="w-4 h-4" />
						Refresh
					</Button>
				</div>
			</div>

			{error && (
				<div className="text-red-600 p-2">
					Error loading targets: {String(error.message || error)}
				</div>
			)}

			{isLoading && !targetUrlsHealthStatus ? (
				<div className="flex items-center justify-center min-h-[150px]">
					<Spinner className="size-8" />
				</div>
			) : (
				<>
					{/* Summary Section */}
					{targetUrlsHealthStatus && (
						<Card className="shadow-lg bg-muted/30 my-8">
							<CardHeader>
								<CardTitle>Targets Health Summary</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
									<div className="flex flex-col">
										<span className="text-sm text-muted-foreground">Total Targets</span>
										<span className="text-2xl font-bold">
											{targetUrlsHealthStatus?.length || 0}
										</span>
									</div>
									<div className="flex flex-col">
										<span className="text-sm text-muted-foreground">Available</span>
										<span className="text-2xl font-bold text-green-600">
											{
												(
													targetUrlsHealthStatus?.map((t: TargetUrlStatusDto) => t.status) || []
												).filter((s: HealthStatusEnum) => s === HealthStatusEnum.AVAILABLE).length
											}
										</span>
									</div>
									<div className="flex flex-col">
										<span className="text-sm text-muted-foreground">Limited</span>
										<span className="text-2xl font-bold text-yellow-600">
											{
												(
													targetUrlsHealthStatus?.map((t: TargetUrlStatusDto) => t.status) || []
												).filter((s: HealthStatusEnum) => s === HealthStatusEnum.LIMITED).length
											}
										</span>
									</div>
									<div className="flex flex-col">
										<span className="text-sm text-muted-foreground">Down</span>
										<span className="text-2xl font-bold text-red-600">
											{
												(
													targetUrlsHealthStatus?.map((t: TargetUrlStatusDto) => t.status) || []
												).filter((s: HealthStatusEnum) => s === HealthStatusEnum.DOWN).length
											}
										</span>
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					{targetUrlsHealthStatus && targetUrlsHealthStatus?.length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{targetUrlsHealthStatus.map((target: TargetUrlStatusDto, index: number) => {
								const host = getHostnameSafe(target.url);
								const titleAttr = host === 'Invalid URL' ? 'Invalid URL' : target.url;
								return (
									<Card
										key={`${target.url}-${index}`}
										className={`shadow-md border-l-4 ${getStatusColor(target.status)}`}
									>
										<CardHeader className="pb-3">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													{getStatusIcon(target.status)}
													<CardTitle className="text-base truncate" title={titleAttr}>
														{host}
													</CardTitle>
												</div>
												{getStatusBadge(target.status)}
											</div>
										</CardHeader>
										<CardContent>
											<div className="space-y-1">
												<div className="text-xs text-muted-foreground truncate" title={titleAttr}>
													{host === 'Invalid URL' ? 'Invalid URL' : target.url}
												</div>
												<div className="flex justify-between text-sm mt-2">
													<span className="text-muted-foreground">Status:</span>
													<span className="font-medium capitalize">{target.status}</span>
												</div>
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>
					) : (
						<Card className="shadow-md">
							<CardContent className="pt-6">
								<p className="text-center text-muted-foreground">
									No crawler targets configured for health monitoring
								</p>
							</CardContent>
						</Card>
					)}
				</>
			)}
		</div>
	);
}
