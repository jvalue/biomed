import { AlertTriangle, CheckCircle2, RefreshCw, Server, XCircle } from 'lucide-react';
import { HealthStatusEnum } from '@/src/app/api/dto/health/healthStatus.enum';
import { useSystemHealthCheck } from '@/src/app/api/hooks/useHealthCheck';
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

export default function SystemHealthComponent() {
	const {
		data: healthData,
		isLoading,
		isFetching,
		error,
		refetch,
		dataUpdatedAt,
	} = useSystemHealthCheck();

	const getStatusIcon = (status: HealthStatusEnum | undefined) => {
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

	const getStatusBadge = (status: HealthStatusEnum | undefined) => {
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

	const getStatusColor = (status: HealthStatusEnum | undefined) => {
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

	const lastChecked = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString() : 'Never';

	const getServerStatus = (status?: HealthStatusEnum) => {
		if (status === HealthStatusEnum.AVAILABLE) return 'Reachable';
		if (status === HealthStatusEnum.LIMITED) return 'Degraded';
		return 'Unreachable';
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-2xl font-semibold flex items-center gap-2">
					<Server className="w-6 h-6" />
					System Components
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

			{/* Content area: show spinner/error or actual cards, header remains visible */}
			{error ? (
				<div className="text-red-600 p-4">
					Error loading system health: {String(error.message || error)}
				</div>
			) : isLoading && !healthData ? (
				<div className="flex items-center justify-center min-h-[150px]">
					<Spinner className="size-8" />
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<Card className={`shadow-lg border-l-4 ${getStatusColor(healthData?.kubernetesStatus)}`}>
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									{getStatusIcon(healthData?.kubernetesStatus)}
									<div>
										<CardTitle className="text-xl">Kubernetes Cluster</CardTitle>
										<CardDescription>Container orchestration platform</CardDescription>
									</div>
								</div>
								{getStatusBadge(healthData?.kubernetesStatus)}
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

					<Card
						className={`shadow-lg border-l-4 ${getStatusColor(healthData?.orchestratorStatus)}`}
					>
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									{getStatusIcon(healthData?.orchestratorStatus)}
									<div>
										<CardTitle className="text-xl">Workflow Orchestrator</CardTitle>
										<CardDescription>Orchestration engine</CardDescription>
									</div>
								</div>
								{getStatusBadge(healthData?.orchestratorStatus)}
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
			)}
		</div>
	);
}
