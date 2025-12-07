import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

export class ArgoWorkflowRunSpecWorkflowTemplateDto {
	@Expose()
	@IsString()
	name!: string;
}
