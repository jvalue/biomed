import { Type } from 'class-transformer';
import {
	IsArray,
	IsBoolean,
	IsDate,
	IsNumber,
	IsOptional,
	IsString,
	ValidateNested,
} from 'class-validator';
import { ArgoParameterDto } from '../argo-parameter.dto';

class ArgoCronWorkflowMetadataDto {
	@IsString()
	name!: string;

	@IsString()
	namespace!: string;

	@IsDate()
	creationTimestamp!: Date;
}

class ArgoCronWorkflowSpecWorkflowSpecArgumentsDto {
	@IsOptional()
	@ValidateNested({ each: true })
	@Type(() => ArgoParameterDto)
	parameters?: ArgoParameterDto[];
}

class ArgoCronWorkflowSpecWorkflowSpecWorkflowTemplateRefDto {
	@IsString()
	name!: string;
}

class ArgoRetryStrategyBackoffDto {
	@IsString()
	@IsOptional()
	duration?: string;

	@IsNumber()
	@IsOptional()
	factor?: number;

	@IsString()
	@IsOptional()
	cap?: string;

	@IsString()
	@IsOptional()
	maxDuration?: string;
}

class ArgoCronWorkflowSpecWorkflowSpecRetryStrategyDto {
	@IsNumber()
	limit?: number;

	@ValidateNested()
	@Type(() => ArgoRetryStrategyBackoffDto)
	@IsOptional()
	backoff?: ArgoRetryStrategyBackoffDto;
}

class ArgoCronWorkflowSpecWorkflowSpecDto {
	@ValidateNested()
	@Type(() => ArgoCronWorkflowSpecWorkflowSpecWorkflowTemplateRefDto)
	@IsOptional()
	workflowTemplateRef?: ArgoCronWorkflowSpecWorkflowSpecWorkflowTemplateRefDto;

	@ValidateNested()
	@Type(() => ArgoCronWorkflowSpecWorkflowSpecArgumentsDto)
	@IsOptional()
	arguments?: ArgoCronWorkflowSpecWorkflowSpecArgumentsDto;

	@ValidateNested()
	@Type(() => ArgoCronWorkflowSpecWorkflowSpecRetryStrategyDto)
	@IsOptional()
	retryStrategy?: ArgoCronWorkflowSpecWorkflowSpecRetryStrategyDto;
}

class ArgoCronWorkflowSpecDto {
	@ValidateNested()
	@Type(() => ArgoCronWorkflowSpecWorkflowSpecDto)
	workflowSpec!: ArgoCronWorkflowSpecWorkflowSpecDto;

	// Argo returns schedules as an array, but we only need the first value as we only support single schedules
	@IsArray()
	@IsString({ each: true })
	schedules!: string[];

	@IsOptional()
	@IsString()
	timezone?: string;

	@IsBoolean()
	suspend!: boolean;
}

class ArgoCronWorkflowStatusDto {
	@IsNumber()
	succeeded!: number;

	@IsNumber()
	failed!: number;
}

export class ArgoCronWorkflowDto {
	@ValidateNested()
	@Type(() => ArgoCronWorkflowMetadataDto)
	metadata!: ArgoCronWorkflowMetadataDto;

	@ValidateNested()
	@Type(() => ArgoCronWorkflowSpecDto)
	spec!: ArgoCronWorkflowSpecDto;

	@ValidateNested()
	@Type(() => ArgoCronWorkflowStatusDto)
	status!: ArgoCronWorkflowStatusDto;
}
