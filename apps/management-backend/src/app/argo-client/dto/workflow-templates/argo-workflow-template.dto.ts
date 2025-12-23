import { Type } from 'class-transformer';
import { IsArray, IsDate, IsOptional, IsString } from 'class-validator';

class ArgoWorkflowTemplateMetadataLabelsDto {
	@IsString()
	@IsOptional()
	'template-version'?: string;
}

class ArgoWorkflowTemplateMetadataDto {
	@IsString()
	name!: string;

	@IsString()
	namespace!: string;

	@Type(() => Date)
	@IsDate()
	creationTimestamp!: Date;

	@Type(() => ArgoWorkflowTemplateMetadataLabelsDto)
	labels!: ArgoWorkflowTemplateMetadataLabelsDto;
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
	parameters?: ArgoWorkflowTemplateSpecDtoArgumentsParametersDto[];
}

class ArgoWorkflowTemplateSpecDto {
	@Type(() => ArgoWorkflowTemplateSpecArgumentsDto)
	@IsOptional()
	arguments?: ArgoWorkflowTemplateSpecArgumentsDto;
}

export class ArgoWorkflowTemplateDto {
	@Type(() => ArgoWorkflowTemplateMetadataDto)
	metadata!: ArgoWorkflowTemplateMetadataDto;

	@Type(() => ArgoWorkflowTemplateSpecDto)
	spec!: ArgoWorkflowTemplateSpecDto;
}
