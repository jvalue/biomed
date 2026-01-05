import { AlertTriangle, CheckCircle2, Globe, RefreshCw, XCircle } from 'lucide-react';
import { useTargetUrlsHealthCheck } from '@/src/app/api/hooks/useHealthCheck';
import { Badge } from '@/src/app/components/design-components/badge';
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

const getHostnameSafe = (url?: string) => {
	if (!url) return 'Invalid URL';
	try {
		return new URL(url).hostname;
	} catch {
		return 'Invalid URL';
	}
};

const getStatusIcon = (status: HealthStatusEnum) => {
	switch (status) {
		case HealthStatusEnum.AVAILABLE:
			return <CheckCircle2 className="w-6 h-6 text-green-600" />;
		case HealthStatusEnum.LIMITED:
			return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
		case HealthStatusEnum.DOWN:
			return <XCircle className="w-6 h-6 text-red-600" />;
		default:
			return <AlertTriangle className="w-6 h-6 text-gray-400" />;
	}
};

const getStatusBadge = (status: HealthStatusEnum) => {
	switch (status) {
		case HealthStatusEnum.AVAILABLE:
			return (
				<Badge className="bg-green-100 text-green-800 border border-green-300">Available</Badge>
			);
		case HealthStatusEnum.LIMITED:
			return (
				<Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">Limited</Badge>
			);
		case HealthStatusEnum.DOWN:
			return <Badge className="bg-red-100 text-red-800 border border-red-300">Down</Badge>;
		default:
			return <Badge variant="outline">Unknown</Badge>;
	}
};

const getStatusColor = (status: HealthStatusEnum) => {
	switch (status) {
		case HealthStatusEnum.AVAILABLE:
			return 'border-l-green-500';
		case HealthStatusEnum.LIMITED:
			return 'border-l-yellow-500';
		case HealthStatusEnum.DOWN:
			return 'border-l-red-500';
		default:
			return 'border-l-gray-400';
	}
};

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

			{/* Loading: keep header visible, show spinner in content area */}
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
