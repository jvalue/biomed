import { UserDto, UserStatus } from '@/src/app/api/dto/user/user.dto';
import { managementBackendClient } from '../management-backend-client';

export const usersService = {
	/*
	 * Method to fetch all users optionally filtered by status from the management backend.
	 * @param status - Optional status to filter users by.
	 */
	getUsers: async (status?: UserStatus): Promise<UserDto[]> => {
		const response = await managementBackendClient.get<UserDto[]>('/users', {
			params: status ? { status } : {},
		});
		return response.data;
	},

	/*
	 * Method to approve a user with the given id.
	 * @param userId - The id of the user to approve.
	 */
	approveUser: async (userId: string): Promise<void> => {
		await managementBackendClient.patch(`/users/${userId}/approve`);
	},

	/*
	 * Method to block a user with the given id.
	 * @param userId - The id of the user to block.
	 */
	blockUser: async (userId: string): Promise<void> => {
		await managementBackendClient.patch(`/users/${userId}/block`);
	},

	/*
	 * Method to update a user's permissions.
	 * @param userId - The id of the user to update.
	 * @param permissions - The new set of permissions for the user.
	 */
	updateUserPermissions: async (userId: string, permissions: string[]): Promise<UserDto> => {
		const response = await managementBackendClient.patch<UserDto>(`/users/${userId}/permissions`, {
			permissions,
		});
		return response.data;
	},

	/*
	 * Method to get a user by id.
	 * @param userId - The id of the user to fetch.
	 */
	getUserById: async (userId: string): Promise<UserDto> => {
		const response = await managementBackendClient.get<UserDto>(`/users/${userId}`);
		return response.data;
	},
};
