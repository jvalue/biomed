import { Expose } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';

export class ArgoWorkflowRunStatusDto {
	// TODO: possibly change to enum
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
