import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class CrawlerRunDownloadMetricsIncomingDto {
	@ApiProperty({
		description: 'Total number of datasets to download',
		required: false,
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	totalDatasetsToDownload?: number;

	@ApiProperty({
		description: 'Number of datasets successfully downloaded',
		required: false,
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	downloadedDatasets?: number;

	@ApiProperty({
		description: 'Total number of gigabytes to download',
		required: false,
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	totalGBToDownload?: number;

	@ApiProperty({
		description: 'Number of gigabytes successfully downloaded',
		required: false,
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	downloadedGB?: number;

	@ApiProperty({
		description: 'Run start timestamp (ISO 8601, UTC recommended), e.g. 2026-01-20T13:00:00.000Z',
		example: '2026-01-20T13:00:00.000Z',
	})
	@IsDateString()
	runStartedAt!: string;
}
