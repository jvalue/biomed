import { useQuery } from '@tanstack/react-query';
import { healthService } from '@/src/app/api/services/health.service';

export const useHealthCheck = () => {
	return useQuery({
		queryKey: ['healthCheck'],
		queryFn: healthService.getHealthStatus,
		refetchInterval: 30000, // Auto-refresh
	});
};
