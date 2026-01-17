import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CrawlerRunMetricsIncomingDto {
	@ApiProperty({
		description: 'Name of the schedule associated with the crawler run',
		required: false,
	})
	@IsOptional()
	@IsString()
	scheduleName?: string;

	@ApiProperty({
		description: 'Namespace of the schedule associated with the crawler run',
		required: false,
	})
	@IsOptional()
	@IsString()
	scheduleNamespace?: string;

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
