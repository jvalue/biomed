import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { UserDto, UserStatus } from '@/src/app/api/dto/user/user.dto';
import { usersService } from '@/src/app/api/services/users-service';

export const useUsers = (status?: UserStatus): UseQueryResult<UserDto[]> => {
	return useQuery({
		queryKey: ['users'],
		queryFn: () => usersService.getUsers(status),
		refetchInterval: 30000, // Auto-refresh
	});
};
