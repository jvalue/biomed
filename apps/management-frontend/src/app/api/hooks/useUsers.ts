import { UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserDto, UserStatus } from '@/src/app/api/dto/user/user.dto';
import { isRetryableError } from '@/src/app/api/hooks/hook-utils';
import { usersService } from '../services/users.service';

/**
 * Hook to fetch users, optionally filtered by status.
 * @param status
 */
export const useUsers = (status?: UserStatus): UseQueryResult<UserDto[]> => {
	return useQuery({
		queryKey: ['users', 'list'],
		queryFn: () => usersService.getUsers(status),
		refetchInterval: (query) => {
			if (query.state.error) {
				if (isRetryableError(query.state.error)) {
					return 60000; // Retry every minute on retryable errors
				} else {
					return false; // Do not retry on non-retryable errors
				}
			}
			return 30000;
		},
		// Handled by the refetchInterval logic
		retry: false,
	});
};

/**
 * Hook to fetch a user by ID.
 * @param userId
 */
export const useUserById = (userId: string): UseQueryResult<UserDto> => {
	return useQuery({
		queryKey: ['users', userId],
		queryFn: () => usersService.getUserById(userId),
	});
};

/*
 * Approve a user by their ID and invalidate the users query on success.
 */
export const useApproveUser = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (userId: string) => usersService.approveUser(userId),
		onSuccess: (_data, userId) => {
			// Invalidate and refetch users query to reflect changes
			queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
			queryClient.invalidateQueries({ queryKey: ['users', userId] });
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
		onSuccess: (_data, userId) => {
			// Invalidate and refetch users query to reflect changes
			queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
			queryClient.invalidateQueries({ queryKey: ['users', userId] });
		},
	});
};

/**
 * Update a user's permissions and invalidate the user query on success.
 */
export const useUpdateUserPermissions = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ userId, permissions }: { userId: string; permissions: string[] }) =>
			usersService.updateUserPermissions(userId, permissions),
		onSuccess: (_data, variables) => {
			// Invalidate and refetch user query to reflect changes
			queryClient.invalidateQueries({ queryKey: ['users', variables.userId] });
		},
	});
};
