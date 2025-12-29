export enum WorkflowPhaseEnum {
	PENDING = 'Pending',
	RUNNING = 'Running',
	SUCCEEDED = 'Succeeded',
	FAILED = 'Failed',
	ERROR = 'Error',
}

export class CrawlerRunDto {
	name!: string;
	namespace!: string;
	workflowTemplateName!: string;
	scheduleName?: string;
	phase!: WorkflowPhaseEnum;
	startedAt?: Date;
	finishedAt?: Date;
}
