import { Type } from 'class-transformer';
import { IsArray, IsDate, IsOptional, IsString, ValidateNested } from 'class-validator';

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

	@ValidateNested()
	@Type(() => ArgoWorkflowTemplateMetadataLabelsDto)
	@IsOptional()
	labels?: ArgoWorkflowTemplateMetadataLabelsDto;
}

class ArgoWorkflowTemplateSpecArgumentsParametersDto {
	@IsString()
	name!: string;

	@IsString()
	@IsOptional()
	value?: string;
}

class ArgoWorkflowTemplateSpecArgumentsDto {
	@IsArray()
	@IsOptional()
	@ValidateNested({ each: true })
	@Type(() => ArgoWorkflowTemplateSpecArgumentsDto)
	parameters?: ArgoWorkflowTemplateSpecArgumentsParametersDto[];
}

class ArgoWorkflowTemplateSpecDto {
	@ValidateNested()
	@Type(() => ArgoWorkflowTemplateSpecArgumentsDto)
	@IsOptional()
	arguments?: ArgoWorkflowTemplateSpecArgumentsDto;
}

export class ArgoWorkflowTemplateDto {
	@ValidateNested()
	@Type(() => ArgoWorkflowTemplateMetadataDto)
	metadata!: ArgoWorkflowTemplateMetadataDto;

	@ValidateNested()
	@Type(() => ArgoWorkflowTemplateSpecDto)
	@IsOptional()
	spec?: ArgoWorkflowTemplateSpecDto;
}
