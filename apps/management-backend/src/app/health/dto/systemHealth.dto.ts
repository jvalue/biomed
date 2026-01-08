import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { HealthStatusEnum } from '../enum/healthStatus.enum';

export class SystemHealthDto {
	@ApiProperty({
		description: 'Health status of the kubernetes cluster',
		example: 'available',
		enum: ['available', 'limited', 'down'],
	})
	@IsEnum(HealthStatusEnum)
	kubernetesStatus!: HealthStatusEnum;

	@ApiProperty({
		description: 'Health status of the orchestrator service',
		example: 'available',
		enum: ['available', 'limited', 'down'],
	})
	@IsEnum(HealthStatusEnum)
	orchestratorStatus!: HealthStatusEnum;
}
