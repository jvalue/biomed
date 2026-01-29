import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ApiKeyCreationResponseDto {
	@ApiProperty({ description: 'The unique identifier of the API key' })
	@IsString()
	id: string;
	@ApiProperty({ description: 'The prefix of the API key' })
	@IsString()
	prefix: string;
	/**
	 * The raw API key. This value is only available once and MUST NOT be logged or stored.
	 * Show it to the user immediately and discard it from memory.
	 */
	@ApiProperty({
		description:
			'The raw API key. This value is only available once and MUST NOT be logged or stored.',
	})
	@IsString()
	rawKey: string;
}
