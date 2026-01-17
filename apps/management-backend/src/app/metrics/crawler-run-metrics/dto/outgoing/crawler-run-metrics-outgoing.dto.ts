import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CrawlerRunMetricsOutgoingDto {
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
}
