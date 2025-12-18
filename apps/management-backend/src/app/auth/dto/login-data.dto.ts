import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginDataDto {
	@ApiProperty({ type: String, description: 'The username of the user' })
	@IsString()
	username!: string;

	@ApiProperty({ type: String, description: 'The encrypted password of the user' })
	@IsString()
	password!: string;
}
