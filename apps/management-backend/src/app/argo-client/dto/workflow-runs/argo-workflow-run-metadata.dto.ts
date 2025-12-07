import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

export class ArgoWorkflowRunMetadataDto {
	@Expose()
	@IsString()
	name!: string;

	@Expose()
	@IsString()
	namespace!: string;
}
