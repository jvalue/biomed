// Contains all non-sensitive information about an API key
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsOptional, IsString } from 'class-validator';

export class ApiKeySafeDto {
	@ApiProperty({ description: 'The unique identifier of the API key' })
	@IsString()
	id: string;

	@ApiProperty({ description: 'The prefix of the API key' })
	@IsString()
	prefix: string;
	@ApiProperty({ description: 'The description of the API key' })
	@IsString()
	description: string;
	@ApiProperty({ description: 'Whether the API key is active' })
	@IsBoolean()
	isActive: boolean;
	@ApiProperty({ description: 'The date and time when the API key was created' })
	@IsDate()
	createdAt: Date;

	@ApiProperty({ description: 'The date and time when the API key was last used', nullable: true })
	@IsDate()
	@IsOptional()
	lastUsedAt: Date | null;
}
