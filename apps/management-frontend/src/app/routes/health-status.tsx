import { createFileRoute } from '@tanstack/react-router';
import { AlertTriangle, CheckCircle2, Globe, RefreshCw, Server, XCircle } from 'lucide-react';
import { HealthStatusEnum } from '@/src/app/api/dto/health/healthCheck.dto';
import { useHealthCheck } from '@/src/app/api/hooks/useHealthCheck';
import { Badge } from '@/src/app/components/design-components/badge';
import { Button } from '@/src/app/components/design-components/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/src/app/components/design-components/card';
import { Spinner } from '@/src/app/components/design-components/spinner';

export const Route = createFileRoute('/health-status')({
	component: RouteComponent,
});

function RouteComponent() {
	const { data: healthData, isLoading, error, refetch, dataUpdatedAt } = useHealthCheck();

	// helper: safely extract hostname or return 'Invalid URL'
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

	if (isLoading && !healthData) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<Spinner className="size-10" />
			</div>
		);
	}

	if (error) {
		return <div className="text-red-600 p-4">Error loading health status: {error.message}</div>;
	}

	const lastChecked = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString() : 'Never';

	// Helper functions for status text
	const getServerStatus = (status?: HealthStatusEnum) => {
		if (status === HealthStatusEnum.AVAILABLE) return 'Reachable';
		if (status === HealthStatusEnum.LIMITED) return 'Degraded';
		return 'Unreachable';
	};

	return (
		<div className="space-y-6">
			{/* Header with Overall Status */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h1 className="text-3xl font-bold">System Health Status</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Last checked: {lastChecked} • Auto-refreshes every 30 seconds
					</p>
				</div>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium">Overall Status:</span>
						{healthData && getStatusBadge(healthData.overAllStatus)}
					</div>
					<Button
						type="button"
						size="sm"
						onClick={() => refetch()}
						className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
					>
						<RefreshCw className="w-4 h-4" />
						Refresh
					</Button>
				</div>
			</div>

			{/* System Components Section */}
			<div>
				<h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
					<Server className="w-6 h-6" />
					System Components
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Kubernetes Status */}
					<Card
						className={`shadow-lg border-l-4 ${getStatusColor(
							healthData?.kubernetesStatus || HealthStatusEnum.DOWN,
						)}`}
					>
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									{getStatusIcon(healthData?.kubernetesStatus || HealthStatusEnum.DOWN)}
									<div>
										<CardTitle className="text-xl">Kubernetes Cluster</CardTitle>
										<CardDescription>Container orchestration platform</CardDescription>
									</div>
								</div>
								{healthData && getStatusBadge(healthData.kubernetesStatus)}
							</div>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">API Server:</span>
									<span className="font-medium">
										{getServerStatus(healthData?.kubernetesStatus)}
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Status:</span>
									<span className="font-medium capitalize">
										{healthData?.kubernetesStatus || 'Unknown'}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Orchestrator Status */}
					<Card
						className={`shadow-lg border-l-4 ${getStatusColor(
							healthData?.orchestratorStatus || HealthStatusEnum.DOWN,
						)}`}
					>
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									{getStatusIcon(healthData?.orchestratorStatus || HealthStatusEnum.DOWN)}
									<div>
										<CardTitle className="text-xl">Workflow Orchestrator</CardTitle>
										<CardDescription>Orchestration engine</CardDescription>
									</div>
								</div>
								{healthData && getStatusBadge(healthData.orchestratorStatus)}
							</div>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Server:</span>
									<span className="font-medium">
										{getServerStatus(healthData?.orchestratorStatus)}
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Status:</span>
									<span className="font-medium capitalize">
										{healthData?.orchestratorStatus || 'Unknown'}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Crawler Targets Section */}
			<div>
				<h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
					<Globe className="w-6 h-6" />
					Crawler Targets
				</h2>
				{/* Summary Section */}
				{healthData && (
					<Card className="shadow-lg bg-muted/30 my-8">
						<CardHeader>
							<CardTitle>Targets Health Summary</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
								<div className="flex flex-col">
									<span className="text-sm text-muted-foreground">Total Targets</span>
									<span className="text-2xl font-bold">
										{healthData.targetUrlsStatus?.length || 0}
									</span>
								</div>
								<div className="flex flex-col">
									<span className="text-sm text-muted-foreground">Available</span>
									<span className="text-2xl font-bold text-green-600">
										{
											(healthData.targetUrlsStatus?.map((t) => t.status) || []).filter(
												(s) => s === HealthStatusEnum.AVAILABLE,
											).length
										}
									</span>
								</div>
								<div className="flex flex-col">
									<span className="text-sm text-muted-foreground">Limited</span>
									<span className="text-2xl font-bold text-yellow-600">
										{
											(healthData.targetUrlsStatus?.map((t) => t.status) || []).filter(
												(s) => s === HealthStatusEnum.LIMITED,
											).length
										}
									</span>
								</div>
								<div className="flex flex-col">
									<span className="text-sm text-muted-foreground">Down</span>
									<span className="text-2xl font-bold text-red-600">
										{
											(healthData.targetUrlsStatus?.map((t) => t.status) || []).filter(
												(s) => s === HealthStatusEnum.DOWN,
											).length
										}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{healthData?.targetUrlsStatus && healthData.targetUrlsStatus.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{healthData.targetUrlsStatus.map((target, index) => {
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
			</div>
		</div>
	);
}
