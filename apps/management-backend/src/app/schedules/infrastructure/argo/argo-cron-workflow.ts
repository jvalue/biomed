export interface WorkflowParameter {
	name: string;
	value: string;
}

interface WorkflowTemplateRef {
	name: string;
}

interface WorkflowSpec {
	workflowTemplateRef: WorkflowTemplateRef;
	arguments?: {
		parameters: WorkflowParameter[];
	};
	workflowMetadata?: {
		labels?: Record<string, string>;
	};
}

interface CronWorkflowSpec {
	// somehow argo saves this as an array, but we only use one schedule per cron workflow
	schedules: string[];
	concurrencyPolicy: 'Forbid' | 'Allow' | 'Replace';
	startingDeadlineSeconds: number;
	workflowSpec: WorkflowSpec;
	timezone?: string;
	suspend?: boolean;
}

interface ObjectMeta {
	name: string;
	namespace: string;
	labels?: Record<string, string>;
	annotations?: Record<string, string>;
}

export interface ArgoCronWorkflow {
	apiVersion: string;
	kind: string;
	metadata: ObjectMeta;
	spec: CronWorkflowSpec;
}
