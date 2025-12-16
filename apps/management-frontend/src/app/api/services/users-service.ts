import { UserDto, UserStatus } from '@/src/app/api/dto/user/user.dto';
import { managementBackendClient } from '../management-backend-client';

export const usersService = {
	getUsers: async (status?: UserStatus): Promise<UserDto[]> => {
		const response = await managementBackendClient.get<UserDto[]>('/users', {
			params: status ? { status } : {},
		});
		return response.data;
	},
};
