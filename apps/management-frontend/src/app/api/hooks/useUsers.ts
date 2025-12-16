import { UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserDto, UserStatus } from '@/src/app/api/dto/user/user.dto';
import { usersService } from '../services/users.service';

/**
 * Hook to fetch users, optionally filtered by status.
 * @param status
 */
export const useUsers = (status?: UserStatus): UseQueryResult<UserDto[]> => {
	return useQuery({
		queryKey: ['users'],
		queryFn: () => usersService.getUsers(status),
		refetchInterval: 30000, // Auto-refresh
	});
};

/*
 * Approve a user by their ID and invalidate the users query on success.
 */
export const useApproveUser = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (userId: string) => usersService.approveUser(userId),
		onSuccess: () => {
			// Invalidate and refetch users query to reflect changes
			queryClient.invalidateQueries({ queryKey: ['users'] });
		},
	});
};

/**
 * Block a user by their ID and invalidate the users query on success.
 */
export const useBlockUser = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (userId: string) => usersService.blockUser(userId),
		onSuccess: () => {
			// Invalidate and refetch users query to reflect changes
			queryClient.invalidateQueries({ queryKey: ['users'] });
		},
	});
};
