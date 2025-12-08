import { IsString } from 'class-validator';

export class ArgoWorkflowRunSpecWorkflowTemplateDto {
	@IsString()
	name!: string;
}
