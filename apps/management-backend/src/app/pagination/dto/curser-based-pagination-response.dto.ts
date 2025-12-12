import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class CurserBasedPaginationResponseDto<T> {
	@ApiProperty({
		isArray: true,
		description: 'Items',
	})
	data!: T[];

	@ApiProperty({
		description: 'Pagination Metadata',
	})
	@Type(() => CurserBasedPaginationMetadata)
	metadata!: CurserBasedPaginationMetadata;
}

class CurserBasedPaginationMetadata {
	@ApiProperty({
		type: Boolean,
		description: 'Indicates if there is a next page of workflow runs available',
	})
	@IsBoolean()
	hasMore!: boolean;
}
