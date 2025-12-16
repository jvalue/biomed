import { useQuery } from '@tanstack/react-query';
import { usersService } from '@/src/app/api/services/users-service';

export const usePendingUsers = () => {
	return useQuery({
		queryKey: ['users'],
		queryFn: usersService.getPendingUsers,
		refetchInterval: 30000, // Auto-refresh
	});
};
