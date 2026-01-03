import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum } from 'class-validator';

export enum HealthStatusEnum {
	AVAILABLE = 'available',
	LIMITED = 'limited',
	DOWN = 'down',
}

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

export class HealthCheckDto {
	@ApiProperty({
		description: 'Overall health status of the application',
		example: 'available',
		enum: ['available', 'limited', 'down'],
	})
	@IsEnum(HealthStatusEnum)
	overAllStatus!: HealthStatusEnum;

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

	@ApiProperty({
		description: 'Health status of external target URLs',
		type: [TargetUrlStatusDto],
	})
	@IsArray()
	@Type(() => TargetUrlStatusDto)
	targetUrlsStatus!: TargetUrlStatusDto[];
}
