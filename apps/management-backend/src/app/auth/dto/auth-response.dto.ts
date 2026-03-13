import { RawRule } from '@casl/ability';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { UserDto } from '../../users/dto/user.dto';

export class AuthResponseDto {
	@ApiProperty({ type: UserDto, description: 'The authenticated user details' })
	@ValidateNested()
	@Type(() => UserDto)
	user!: UserDto;

	@ApiProperty({ type: [Object], description: 'The serialized ability rules for the user' })
	abilityRules!: RawRule[];
}
