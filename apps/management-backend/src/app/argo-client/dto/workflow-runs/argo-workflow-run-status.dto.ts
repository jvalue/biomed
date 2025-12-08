import { IsDate, IsString } from 'class-validator';

export class ArgoWorkflowRunStatusDto {
	// TODO: possibly change to enum

	@IsString()
	phase!: string;

	@IsDate()
	startedAt?: Date;

	@IsDate()
	finishedAt?: Date;
}
