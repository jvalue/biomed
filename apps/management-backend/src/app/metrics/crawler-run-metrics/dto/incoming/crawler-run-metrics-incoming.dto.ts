import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CrawlerRunMetricsIncomingDto {
	@ApiProperty({ description: 'Progress of the crawler run (0-100)', required: false })
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(100)
	progress?: number;

	@ApiProperty({ description: 'Number of data sets crawled in this run so far', required: false })
	@IsOptional()
	@IsNumber()
	crawledDataSets?: number;

	@ApiProperty({
		description: 'Number of cache hits during this crawler run (regarding datasets)',
		required: false,
	})
	@IsOptional()
	@IsNumber()
	cacheHits?: number;

	@ApiProperty({
		description: 'Run start timestamp (ISO 8601, UTC recommended), e.g. 2026-01-20T13:00:00.000Z',
		example: '2026-01-20T13:00:00.000Z',
	})
	@IsDateString()
	runStartedAt!: string;
}
