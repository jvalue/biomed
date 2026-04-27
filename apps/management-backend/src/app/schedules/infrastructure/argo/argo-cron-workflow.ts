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
	retryStrategy?: RetryStrategy;
}

interface CronWorkflowSpec {
	// somehow argo saves this as an array, but we only use one schedule per cron workflow
	schedules: string[];
	concurrencyPolicy: 'Forbid' | 'Allow' | 'Replace';
	startingDeadlineSeconds: number;
	workflowSpec: WorkflowSpec;
	timezone?: string;
	suspend?: boolean;
	automountServiceAccountToken?: boolean;
}

interface RetryStrategyBackoff {
	// Initial delay before first retry
	duration?: string;

	// Multiplier to increase delay between retries
	factor?: number;

	// Maximum delay between retries
	cap?: string;

	// Maximum duration overall for backoff
	maxDuration?: string;
}

interface RetryStrategy {
	retryPolicy: 'Always' | 'OnFailure' | 'OnError' | 'OnTransientError';
	limit: number;
	backoff?: RetryStrategyBackoff;
}

interface ObjectMeta {
	namespace: string;
	name: string;
	labels?: Record<string, string>;
	annotations?: Record<string, string>;
}

export interface ArgoCronWorkflow {
	apiVersion: string;
	kind: string;
	metadata: ObjectMeta;
	spec: CronWorkflowSpec;
}
