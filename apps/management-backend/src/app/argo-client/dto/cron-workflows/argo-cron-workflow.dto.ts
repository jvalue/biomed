import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional, IsString } from 'class-validator';

class ArgoCronWorkflowMetadataDto {
	@IsString()
	name!: string;

	@IsString()
	namespace!: string;

	@IsDate()
	creationTimestamp!: Date;
}

class ArgoCronWorkflowSpecWorkflowSpecArgumentsParameterDto {
	@IsString()
	name!: string;

	@IsString()
	value!: string;
}

class ArgoCronWorkflowSpecWorkflowSpecArgumentsDto {
	@IsOptional()
	@Type(() => ArgoCronWorkflowSpecWorkflowSpecArgumentsParameterDto)
	parameters?: ArgoCronWorkflowSpecWorkflowSpecArgumentsParameterDto[];
}

class ArgoCronWorkflowSpecWorkflowSpecWorkflowTemplateRefDto {
	@IsString()
	name!: string;
}

class ArgoCronWorkflowSpecWorkflowSpecDto {
	@Type(() => ArgoCronWorkflowSpecWorkflowSpecWorkflowTemplateRefDto)
	@IsOptional()
	workflowTemplateRef?: ArgoCronWorkflowSpecWorkflowSpecWorkflowTemplateRefDto;

	@Type(() => ArgoCronWorkflowSpecWorkflowSpecArgumentsDto)
	@IsOptional()
	arguments?: ArgoCronWorkflowSpecWorkflowSpecArgumentsDto;
}

class ArgoCronWorkflowSpecDto {
	@Type(() => ArgoCronWorkflowSpecWorkflowSpecDto)
	workflowSpec!: ArgoCronWorkflowSpecWorkflowSpecDto;

	// Argo returns schedules as an array, but we only need the first value as we only support single schedules
	@Transform(({ value }) => Array.isArray(value) ? value[0] : value, { toClassOnly: true })
	@IsString()
	schedules!: string;

	@IsBoolean()
	suspend!: boolean;
}

export class ArgoCronWorkflowDto {
	@Type(() => ArgoCronWorkflowMetadataDto)
	metadata!: ArgoCronWorkflowMetadataDto;

	@Type(() => ArgoCronWorkflowSpecDto)
	spec!: ArgoCronWorkflowSpecDto;
}
