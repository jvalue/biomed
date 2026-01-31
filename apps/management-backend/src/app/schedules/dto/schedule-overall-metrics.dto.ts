import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class ScheduleOverallMetricsDto {
	@ApiProperty({ description: 'Total number of crawled datasets across all time' })
	@IsNumber()
	totalCrawledDataSets!: number;

	@ApiProperty({
		description: 'Total number of new datasets (crawled - cacheHits) across all time',
	})
	@IsNumber()
	totalNewDataSets!: number;

	@ApiProperty({ description: 'New datasets percentage across all time (0-1)' })
	@IsNumber()
	totalNewDataSetsPercentage!: number;
}
