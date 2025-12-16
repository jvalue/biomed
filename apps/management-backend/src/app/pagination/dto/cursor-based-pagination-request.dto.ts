import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class CursorBasedPaginationRequestDto {
	@ApiProperty({
		type: Number,
		description: 'Number of items to retrieve (if available)',
		required: false,
	})
	@Type(() => Number)
	@IsNumber()
	@IsOptional()
	limit?: number;

	@ApiProperty({
		type: Number,
		description: 'Number of skipped items (can only be used in combination with limit)',
		required: false,
	})
	@Type(() => Number)
	@IsNumber()
	@IsOptional()
	offset?: number;
}
