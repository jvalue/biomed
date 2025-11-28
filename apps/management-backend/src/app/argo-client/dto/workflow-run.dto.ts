export class WorkflowRunDto {
	metadata!: {
		name: string;
		namespace: string;
		labels?: Record<string, string>;
	};
}
