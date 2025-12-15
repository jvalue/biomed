import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDate, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { UserPermission } from '../../auth/enums/user-permission.enum';
import { UserStatus } from '../../auth/enums/user-status.enum';

export class UserDto {
	@ApiProperty({ type: String, format: 'uuid', description: 'The unique identifier of the user' })
	@IsUUID()
	id!: string;

	@ApiProperty({ type: String, description: 'The username of the user' })
	@IsString()
	username!: string;

	@ApiProperty({
		enum: UserStatus,
		enumName: 'UserStatus',
		description: 'The current status of the user',
	})
	@IsEnum(UserStatus)
	status: UserStatus;

	@ApiProperty({
		type: [String],
		enum: UserPermission,
		isArray: true,
		description: 'The permissions assigned to the user',
	})
	@IsArray()
	@IsEnum(UserPermission, { each: true })
	permissions: UserPermission[];

	@ApiProperty({
		type: String,
		format: 'date-time',
		description: 'The time when the user was created',
	})
	@IsDate()
	createdAt: Date;

	@ApiProperty({ type: String, description: 'The username of the approver' })
	@IsString()
	@IsOptional()
	approvedBy?: string;

	@ApiProperty({
		type: String,
		format: 'date-time',
		description: 'The time when the user was approved',
	})
	@IsDate()
	@IsOptional()
	approvedAt?: Date;
}
