export class WorkflowRunDto {
	metadata!: {
		name: string;
		namespace: string;
		labels?: Record<string, string>;
	};
	status?: any;
	spec?: any;
}
