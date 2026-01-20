import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class HistoricalMetricsQueryDto {
	@ApiPropertyOptional({
		description: 'Start date for the history (ISO 8601). Defaults to 1 year ago.',
		example: '2025-01-01T00:00:00.000Z',
		required: false,
	})
	@IsOptional()
	@IsDateString()
	from?: string;

	@ApiPropertyOptional({
		description: 'End date for the history (ISO 8601). Defaults to now.',
		example: '2026-01-01T00:00:00.000Z',
		required: false,
	})
	@IsOptional()
	@IsDateString()
	to?: string;
}
