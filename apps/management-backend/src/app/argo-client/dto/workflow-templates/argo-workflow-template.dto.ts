import { Type } from 'class-transformer';
import { IsArray, IsDate, IsOptional, IsString } from 'class-validator';

class ArgoWorkflowTemplateMetadataDto {
	@IsString()
	name!: string;

	@IsString()
	namespace!: string;

	@Type(() => Date)
	@IsDate()
	creationTimestamp!: Date;
}

class ArgoWorkflowTemplateSpecDtoArgumentsParametersDto {
	@IsString()
	name!: string;

	@IsString()
	@IsOptional()
	value?: string;
}

class ArgoWorkflowTemplateSpecArgumentsDto {
	@IsArray()
	parameters!: ArgoWorkflowTemplateSpecDtoArgumentsParametersDto[];
}

class ArgoWorkflowTemplateSpecDto {
	@Type(() => ArgoWorkflowTemplateSpecArgumentsDto)
	arguments!: ArgoWorkflowTemplateSpecArgumentsDto;
}

export class ArgoWorkflowTemplateDto {
	@Type(() => ArgoWorkflowTemplateMetadataDto)
	metadata!: ArgoWorkflowTemplateMetadataDto;

	@Type(() => ArgoWorkflowTemplateSpecDto)
	spec!: ArgoWorkflowTemplateSpecDto;
}
