import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, ValidateNested } from 'class-validator';

class CursorBasedPaginationMetadata {
	@ApiProperty({
		type: Boolean,
		description: 'Indicates if there is a next page of items available',
	})
	@IsBoolean()
	hasMore!: boolean;
}

export class CursorBasedPaginationResponseDto<T> {
	@ApiProperty({
		isArray: true,
		description: 'Items',
	})
	data!: T[];

	@ApiProperty({
		description: 'Pagination Metadata',
	})
	@ValidateNested()
	@Type(() => CursorBasedPaginationMetadata)
	metadata!: CursorBasedPaginationMetadata;
}
