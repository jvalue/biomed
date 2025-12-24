export class WorkflowRunDto {
	name!: string;
	namespace!: string;
	workflowTemplateName!: string;
	scheduleName?: string;
	phase!: string;
	startedAt?: Date;
	finishedAt?: Date;
}
