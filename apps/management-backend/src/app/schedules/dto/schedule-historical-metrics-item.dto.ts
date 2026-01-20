import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber } from 'class-validator';

export class ScheduleHistoricalMetricsItemDto {
	@ApiProperty({ description: 'The date of the data point (YYYY-MM-DD)' })
	@IsDateString()
	date!: string;

	@ApiProperty({ description: 'Total number of crawled datasets (sum)' })
	@IsNumber()
	crawledDataSets!: number;

	@ApiProperty({ description: 'Number of new datasets (crawled - cacheHits)' })
	@IsNumber()
	newDatasets!: number;

	@ApiProperty({ description: 'Percentage of new datasets (0-1)' })
	@IsNumber()
	newDatasetsPercentage!: number;
}
