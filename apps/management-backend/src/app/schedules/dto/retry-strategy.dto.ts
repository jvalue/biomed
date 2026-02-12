import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class RetryStrategyDto {
	@ApiProperty({ description: 'Number of retries in case of failure' })
	@IsInt()
	@Min(0)
	retries!: number;

	@ApiProperty({ description: 'Initial delay before first retry in seconds', required: false })
	@IsNumber()
	@Min(0)
	@IsOptional()
	backoffDuration?: number;

	@ApiProperty({
		description: 'Multiplier to increase/decrease delay between retries',
		required: false,
	})
	@IsNumber()
	@Min(0)
	@IsOptional()
	backoffFactor?: number;

	@ApiProperty({ description: 'Maximum delay between retries in seconds', required: false })
	@IsNumber()
	@Min(0)
	@IsOptional()
	backoffCap?: number;

	@ApiProperty({ description: 'Maximum duration overall for backoff in seconds', required: false })
	@IsNumber()
	@Min(0)
	@IsOptional()
	backoffMaxDuration?: number;
}
