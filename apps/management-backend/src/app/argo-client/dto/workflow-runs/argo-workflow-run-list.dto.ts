import { Type } from 'class-transformer';
import { IsArray } from 'class-validator';
import { ArgoMetadataDto } from '../argo-metadata.dto';
import { ArgoWorkflowRunDto } from './argo-workflow-run.dto';

export class ArgoWorkflowRunListDto {
	@Type(() => ArgoMetadataDto)
	metadata!: ArgoMetadataDto;

	@Type(() => ArgoWorkflowRunDto)
	@IsArray()
	items!: ArgoWorkflowRunDto[];
}
