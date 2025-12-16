import { UserDto } from '@/src/app/api/dto/user/user.dto';
import { managementBackendClient } from '../management-backend-client';

export const usersService = {
	getPendingUsers: async (): Promise<UserDto[]> => {
		const { data } = await managementBackendClient.get('users/pending');
		return data;
	},
};
