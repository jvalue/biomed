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
				// Hardcoded namespace as this should be the namespace where the crawler should run
				namespace: 'argo-managed-crawler',
				labels: {
					'managed-by': 'biomed-management-ui',
				},
			},
			spec: {
				schedules: [],
				concurrencyPolicy: 'Forbid',
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

	public setSchedule(cron: string): this {
		this.workflow.spec.schedules = [cron];
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
		this.workflow.spec.workflowSpec.workflowMetadata.labels['customSetWorkflowTemplateName'] =
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

	public build(): ArgoCronWorkflow {
		// Validation for required fields
		if (!this.workflow.metadata.name) throw new Error('Workflow name is required');
		if (!this.workflow.spec.schedules || this.workflow.spec.schedules.length === 0) {
			throw new Error('Schedule is required');
		}
		if (!this.workflow.spec.workflowSpec.workflowTemplateRef.name) {
			throw new Error('Workflow template reference name is required');
		}
		if (
			!this.workflow.spec.workflowSpec.workflowMetadata?.labels['customSetWorkflowTemplateName']
		) {
			throw new Error('Workflow metadata label for workflow-template-name is required');
		}

		return this.workflow;
	}
}
