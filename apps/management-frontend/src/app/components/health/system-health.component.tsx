import { RefreshCw, Server } from 'lucide-react';
import { useSystemHealthCheck } from '@/src/app/api/hooks/useHealthCheck';
import { Button } from '@/src/app/components/design-components/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/src/app/components/design-components/card';
import { Spinner } from '@/src/app/components/design-components/spinner';
import { getServerStatus, getStatusBadge, getStatusColor, getStatusIcon } from './health-utils';

export default function SystemHealthComponent() {
	const {
		data: healthData,
		isLoading,
		isFetching,
		error,
		refetch,
		dataUpdatedAt,
	} = useSystemHealthCheck();

	const lastChecked = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString() : 'Never';

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
			{error && (
				<div className="text-red-600 p-4">
					Error loading system health: {String(error.message || error)}
				</div>
			)}

			{isLoading && !healthData ? (
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
