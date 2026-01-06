import { Can } from '@casl/react';
import { Link } from '@tanstack/react-router';
import { ChevronDown, Globe, RefreshCw } from 'lucide-react';
import { useTargetUrlsHealthCheck } from '@/src/app/api/hooks/useHealthCheck';
import { Button } from '@/src/app/components/design-components/button';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/src/app/components/design-components/card';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/src/app/components/design-components/collapsible';
import { Spinner } from '@/src/app/components/design-components/spinner';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/src/app/components/design-components/tooltip';
import { useAuth } from '@/src/app/contexts/AuthContext';
import { HealthStatusEnum } from '../../api/dto/health/healthStatus.enum';
import { TargetUrlStatusDto } from '../../api/dto/health/targets/targetUrlStatus.dto';
import { getStatusBadge, getStatusColor, getStatusIcon } from './health-utils';

export default function CrawlerTargetsComponent() {
	const { ability } = useAuth();
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
							{targetUrlsHealthStatus.map((targetStatus: TargetUrlStatusDto, index: number) => {
								const titleAttr = targetStatus.target.displayName;
								return (
									<Card
										key={`${targetStatus.target.url}-${index}`}
										className={`shadow-md border-l-4 ${getStatusColor(targetStatus.status)}`}
									>
										<CardHeader className="pb-3">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													{getStatusIcon(targetStatus.status)}
													<CardTitle className="text-base truncate" title={titleAttr}>
														{targetStatus.target.displayName}
													</CardTitle>
												</div>
												{getStatusBadge(targetStatus.status)}
											</div>
										</CardHeader>
										<CardContent>
											<div className="space-y-1">
												<div className="text-xs text-muted-foreground truncate" title={titleAttr}>
													{targetStatus.target.displayName}
												</div>
												<div className="flex justify-between text-sm mt-2">
													<span className="text-muted-foreground">Status:</span>
													<span className="font-medium capitalize">{targetStatus.status}</span>
												</div>

												<Can ability={ability} I="read" a="schedule">
													<Collapsible>
														<div className="mt-3">
															<Tooltip>
																<TooltipTrigger asChild>
																	<CollapsibleTrigger className="w-full flex items-center justify-between py-2 rounded-md hover:bg-muted/20 text-sm text-muted-foreground">
																		<span>
																			Schedules ({targetStatus.target.schedules?.length || 0})
																		</span>
																		<span className={`transition-transform duration-150`}>
																			<ChevronDown className="w-4 h-4" />
																		</span>
																	</CollapsibleTrigger>
																</TooltipTrigger>
																<TooltipContent side="top">
																	Scheduled crawler runs associated with this target — these runs
																	will likely fail if the target is down.
																</TooltipContent>
															</Tooltip>
															<CollapsibleContent className="mt-2 bg-muted/5 rounded-md">
																{targetStatus.target.schedules &&
																targetStatus.target.schedules.length > 0 ? (
																	targetStatus.target.schedules.map((s, i) => (
																		<Link
																			key={`${s.namespace}-${s.name}-${i}`}
																			to={`/schedules/${s.namespace}/${s.name}`}
																			className="flex justify-between text-sm py-1 hover:bg-muted/10 rounded py-2"
																		>
																			<span className="font-medium">{s.name}</span>
																			<span className="text-muted-foreground">{s.namespace}</span>
																		</Link>
																	))
																) : (
																	<div className="text-sm text-muted-foreground">
																		No schedules linked
																	</div>
																)}
															</CollapsibleContent>
														</div>
													</Collapsible>
												</Can>
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
