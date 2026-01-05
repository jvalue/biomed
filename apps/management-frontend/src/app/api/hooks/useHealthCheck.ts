import { useQuery } from '@tanstack/react-query';
import { healthService } from '@/src/app/api/services/health.service';

export const useSystemHealthCheck = (enabled?: boolean) => {
	return useQuery({
		queryKey: ['system-health'],
		queryFn: () => healthService.getSystemHealthStatus(),
		staleTime: 60000, // 1 minute
		enabled: enabled ?? true,
	});
};

export const useTargetUrlsHealthCheck = () => {
	return useQuery({
		queryKey: ['targets-health'],
		queryFn: () => healthService.getTargetHealthStatus(),
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};
