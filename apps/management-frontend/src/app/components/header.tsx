import { Link } from '@tanstack/react-router';
import { HealthStatusEnum } from '@/src/app/api/dto/health/healthStatus.enum';
import { useSystemHealthCheck } from '@/src/app/api/hooks/useHealthCheck';
import { Avatar, AvatarFallback } from '@/src/app/components/design-components/avatar';
import { LogoutButton } from '@/src/app/components/design-components/logout-button';
import { SidebarTrigger } from '@/src/app/components/design-components/sidebar';
import { Spinner } from '@/src/app/components/design-components/spinner';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/src/app/components/design-components/tooltip';
import { useAuth } from '@/src/app/contexts/AuthContext';
import { getStatusIcon } from './health/health-utils';

export function Header() {
	const { user, isAuthenticated, isLoading } = useAuth();
	const { data: healthStatus, isLoading: healthLoading } = useSystemHealthCheck(isAuthenticated);
	let overallStatus: HealthStatusEnum;

	//Determine overall system status
	if (
		healthStatus?.kubernetesStatus === HealthStatusEnum.DOWN ||
		healthStatus?.orchestratorStatus === HealthStatusEnum.DOWN
	) {
		overallStatus = HealthStatusEnum.DOWN;
	} else if (
		healthStatus?.kubernetesStatus === HealthStatusEnum.LIMITED ||
		healthStatus?.orchestratorStatus === HealthStatusEnum.LIMITED
	) {
		overallStatus = HealthStatusEnum.LIMITED;
	} else {
		overallStatus = HealthStatusEnum.AVAILABLE;
	}

	// Compute header classes based on overall status
	let statusBgClass = '';
	if (!healthLoading && overallStatus === HealthStatusEnum.DOWN) {
		statusBgClass = 'bg-red-50 border-red-600 text-red-700';
	} else if (!healthLoading && overallStatus === HealthStatusEnum.LIMITED) {
		statusBgClass = 'bg-yellow-50 border-yellow-600 text-yellow-700';
	}
	return (
		<div
			className={`sticky top-0 z-30 flex h-16 sm:h-20 w-full items-center justify-between bg-background px-3 sm:px-6 lg:px-12 pb-2 pt-4 border-b ${statusBgClass}`}
		>
			<div className="flex items-center gap-4">
				<SidebarTrigger />
			</div>
			<Link to="/">
				<h2 className="text-bold items-center text-lg sm:text-xl lg:text-2xl text-primary">
					<span className="hidden md:inline">Crawler Management</span>
				</h2>
			</Link>
			<div className="flex items-center gap-4">
				{!isLoading && isAuthenticated ? (
					<>
						{/* Compact System Health Indicator: clickable link to health status page, using shadcn Tooltip, positioned left of avatar */}
						<Tooltip>
							<TooltipTrigger asChild>
								<Link
									to="/health-status"
									className="flex items-center"
									aria-label={`System status: ${overallStatus ?? 'Unknown'}`}
								>
									{healthLoading ? (
										<Spinner className="w-4 h-4 mr-2" />
									) : (
										<div className="flex items-center gap-1 mr-2">{getStatusIcon(overallStatus)}</div>
									)}
								</Link>
							</TooltipTrigger>
							<TooltipContent side="bottom">{overallStatus ?? 'Unknown'}</TooltipContent>
						</Tooltip>

						<Link to="/">
							<div className="h-9 w-9 sm:h-10 sm:w-10">
								<Avatar className="h-full w-full">
									<AvatarFallback>
										{user?.username?.substring(0, 2).toUpperCase() || 'MM'}
									</AvatarFallback>
								</Avatar>
							</div>
						</Link>

						<LogoutButton />
					</>
				) : (
					<Link to="/login">Login</Link>
				)}
			</div>
		</div>
	);
}
