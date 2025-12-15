import { RawRule } from '@casl/ability';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserDto } from '../../users/dto/user.dto';

export class AuthResponseDto {
	@ApiProperty({ type: String, description: 'The JWT access token for authentication' })
	accessToken!: string;

	@ApiProperty({ type: UserDto, description: 'The authenticated user details' })
	@Type(() => UserDto)
	user!: UserDto;

	@ApiProperty({ type: [Object], description: 'The serialized ability rules for the user' })
	abilityRules!: RawRule[];
}
