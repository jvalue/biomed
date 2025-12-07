import { Expose } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';

export class WorkflowRunDto {
	@Expose()
	@IsString()
	name!: string;

	@Expose()
	@IsString()
	namespace!: string;

	@Expose()
	@IsString()
	workflowTemplateName?: string;

	@Expose()
	@IsString()
	phase!: string;

	@Expose()
	@IsDate()
	startedAt?: Date;

	@Expose()
	@IsDate()
	finishedAt?: Date;
}
