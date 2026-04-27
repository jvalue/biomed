import { RetryStrategyDto } from '../../dto/retry-strategy.dto';
import { ArgoCronWorkflow, WorkflowParameter } from './argo-cron-workflow';

/**
 * Builder class for constructing Argo CronWorkflow objects.
 */
export class ArgoCronWorkflowBuilder {
	private workflow: ArgoCronWorkflow;

	constructor() {
		this.reset();
	}

	/**
	 * Resets the builder to its initial state.
	 */
	public reset(): void {
		// Defines the default structure of a CronWorkflow
		this.workflow = {
			apiVersion: 'argoproj.io/v1alpha1',
			kind: 'CronWorkflow',
			metadata: {
				name: '',
				// Default namespace
				namespace: 'argo-managed-crawler',
				labels: {
					'managed-by': 'biomed-management-ui',
				},
			},
			spec: {
				schedules: [],
				concurrencyPolicy: 'Forbid',
				automountServiceAccountToken: true,
				startingDeadlineSeconds: 0,
				workflowSpec: {
					workflowTemplateRef: {
						name: '',
					},
					arguments: {
						parameters: [],
					},
					workflowMetadata: {
						labels: {},
					},
				},
			},
		};
	}

	public setName(name: string): this {
		this.workflow.metadata.name = name;
		return this;
	}

	public setNamespace(namespace: string): this {
		this.workflow.metadata.namespace = namespace;
		return this;
	}

	public setSchedule(cron: string): this {
		this.workflow.spec.schedules = [cron];
		return this;
	}

	public setTimezone(timezone: string): this {
		this.workflow.spec.timezone = timezone;
		return this;
	}

	/**
	 *  Sets the workflow template reference name and a label in the workflow metadata for the template as otherwise
	 *  when the CronWorkflow creates a Workflow from the template and afterwards the corn workflow is deleted, the link
	 *  to the template is lost.
	 * @param templateName
	 */
	public setTemplateRef(templateName: string): this {
		this.workflow.spec.workflowSpec.workflowTemplateRef.name = templateName;
		// Set WorkflowMetadata labels
		if (!this.workflow.spec.workflowSpec.workflowMetadata) {
			this.workflow.spec.workflowSpec.workflowMetadata = { labels: {} };
		}
		if (!this.workflow.spec.workflowSpec.workflowMetadata.labels) {
			this.workflow.spec.workflowSpec.workflowMetadata.labels = {};
		}
		this.workflow.spec.workflowSpec.workflowMetadata.labels.customSetWorkflowTemplateName =
			templateName;

		return this;
	}

	/**
	 * Adds parameters to the workflow arguments.
	 * @param params
	 */
	public addParameters(params: WorkflowParameter[]): this {
		if (!params) return this;

		if (!this.workflow.spec.workflowSpec.arguments) {
			this.workflow.spec.workflowSpec.arguments = { parameters: [] };
		}

		this.workflow.spec.workflowSpec.arguments.parameters.push(...params);
		return this;
	}

	public addLabel(key: string, value: string): this {
		if (!this.workflow.metadata.labels) {
			this.workflow.metadata.labels = {};
		}
		this.workflow.metadata.labels[key] = value;
		return this;
	}

	public addLabels(labels: Record<string, string>): this {
		if (!labels) return this;
		this.workflow.metadata.labels = {
			...this.workflow.metadata.labels,
			...labels,
		};
		return this;
	}

	/**
	 * Adds a retry strategy to the workflow spec.
	 * @param retryStrategy
	 */
	public addRetryStrategy(retryStrategy: RetryStrategyDto): this {
		if (!retryStrategy) return this;
		if (retryStrategy.retries < 0) {
			throw new Error('Retries must be a non-negative integer');
		}
		this.workflow.spec.workflowSpec.retryStrategy = {
			retryPolicy: 'Always',
			limit: retryStrategy.retries,
			backoff: {},
		};

		if (retryStrategy.backoffDuration) {
			if (retryStrategy.backoffDuration < 0) {
				throw new Error('Backoff duration must be a non-negative integer');
			}
			this.workflow.spec.workflowSpec.retryStrategy.backoff.duration =
				retryStrategy.backoffDuration.toString();

			if (retryStrategy.backoffFactor) {
				if (retryStrategy.backoffFactor < 0) {
					throw new Error('Backoff factor must be a non-negative number');
				}
				this.workflow.spec.workflowSpec.retryStrategy.backoff.factor = retryStrategy.backoffFactor;
			}
			if (retryStrategy.backoffCap) {
				if (retryStrategy.backoffCap < 0) {
					throw new Error('Backoff cap must be a non-negative integer');
				}
				this.workflow.spec.workflowSpec.retryStrategy.backoff.cap =
					retryStrategy.backoffCap.toString();
			}
			if (retryStrategy.backoffMaxDuration) {
				if (retryStrategy.backoffMaxDuration < 0) {
					throw new Error('Backoff max duration must be a non-negative integer');
				}
				this.workflow.spec.workflowSpec.retryStrategy.backoff.maxDuration =
					retryStrategy.backoffMaxDuration.toString();
			}

			// Cross-field checks: cap/maxDuration should not be smaller than duration
			const dur = retryStrategy.backoffDuration;
			const cap = retryStrategy.backoffCap;
			const maxDur = retryStrategy.backoffMaxDuration;

			if (dur && cap && cap < dur) {
				throw new Error('backoff.cap must be greater than or equal to backoff.duration');
			}
			if (dur && maxDur && maxDur < dur) {
				throw new Error('backoff.maxDuration must be greater than or equal to backoff.duration');
			}
		} else if (
			retryStrategy.backoffFactor ||
			retryStrategy.backoffCap ||
			retryStrategy.backoffMaxDuration
		) {
			throw new Error('Backoff duration must be set if other backoff parameters are set');
		}
		return this;
	}

	public build(): ArgoCronWorkflow {
		// Validation for required fields
		if (!this.workflow.metadata.name) throw new Error('Workflow name is required');
		if (!this.workflow.spec.schedules || this.workflow.spec.schedules.length === 0) {
			throw new Error('Schedule is required');
		}
		if (!this.workflow.spec.timezone) {
			throw new Error('Timezone is required');
		}
		if (!this.workflow.spec.workflowSpec.workflowTemplateRef.name) {
			throw new Error('Workflow template reference name is required');
		}
		if (!this.workflow.spec.workflowSpec.workflowMetadata?.labels?.customSetWorkflowTemplateName) {
			throw new Error('Workflow metadata label for workflow-template-name is required');
		}
		return this.workflow;
	}
}
