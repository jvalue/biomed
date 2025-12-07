import { Expose, Type } from 'class-transformer';
import { IsArray } from 'class-validator';
import { ArgoMetadataDto } from '../argo-metadata.dto';
import { ArgoWorkflowRunDto } from './argo-workflow-run.dto';

export class ArgoWorkflowRunListDto {
	@Expose()
	@Type(() => ArgoMetadataDto)
	metadata!: ArgoMetadataDto;

	@Expose()
	@Type(() => ArgoWorkflowRunDto)
	@IsArray()
	items!: ArgoWorkflowRunDto[];
}
