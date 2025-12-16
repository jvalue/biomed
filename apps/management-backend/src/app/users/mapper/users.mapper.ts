import {UserEntity} from "../entity/user.entity";
import {UserDto} from "../dto/user.dto";

export function mapUserEntityToUserDto(user: UserEntity): UserDto {
	return {
		id: user.id,
		username: user.username,
		status: user.status,
		permissions: user.permissions,
		createdAt: user.createdAt,
		approvedBy: user.approvedBy,
		approvedAt: user.approvedAt,
	};
}