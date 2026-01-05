import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { HealthStatusEnum } from '../enum/healthStatus.enum';

export class TargetUrlStatusDto {
	@ApiProperty({
		description: 'The URL of the target service',
		example: 'http://example-service.local/health',
	})
	url!: string;

	@ApiProperty({
		description: 'Health status of the target service',
		example: 'available',
		enum: ['available', 'limited', 'down'],
	})
	@IsEnum(HealthStatusEnum)
	status!: HealthStatusEnum;
}
