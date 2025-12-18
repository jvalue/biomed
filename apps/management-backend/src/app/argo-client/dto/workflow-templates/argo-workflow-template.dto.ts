import { Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';

export class ArgoWorkflowTemplateDto {
	@Type(() => ArgoWorkflowTemplateMetadataDto)
	metadata!: ArgoWorkflowTemplateMetadataDto;
}

class ArgoWorkflowTemplateMetadataDto {
	@IsString()
	name!: string;

	@IsString()
	namespace!: string;

	@Type(() => Date)
	@IsDate()
	creationTimestamp!: Date;
}
