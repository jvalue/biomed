export class WorkflowRunDto {
	name!: string;
	namespace!: string;
	workflowTemplateName?: string;
	phase!: string;
	startedAt?: Date;
	finishedAt?: Date;
}
