import { describe, expect, it } from 'vitest';
import { ArgoCronWorkflowBuilder } from './argo-cron-workflow.builder';

describe('ArgoCronWorkflowBuilder', () => {
	it('Build valid cron workflow object', () => {
		const builder = new ArgoCronWorkflowBuilder();
		const workflow = builder
			.setName('nightly-sync')
			.setSchedule('0 2 * * *')
			.setTemplateRef('sync-template')
			.addParameters([{ name: 'inputPath', value: '/data/in' }])
			.addLabels({ env: 'prod' })
			.addRetryStrategy({
				retries: 5,
				backoffDuration: 10,
				backoffFactor: 2,
				backoffCap: 60,
				backoffMaxDuration: 300,
			})
			.build();

		expect(workflow.metadata.name).toBe('nightly-sync');
		expect(workflow.metadata.namespace).toBe('argo-managed-crawler');
		expect(workflow.metadata.labels).toHaveProperty('managed-by', 'biomed-management-ui');
		expect(workflow.metadata.labels).toHaveProperty('env', 'prod');

		expect(workflow.spec.schedules).toEqual(['0 2 * * *']);
		expect(workflow.spec.workflowSpec.workflowTemplateRef.name).toBe('sync-template');

		const params = workflow.spec.workflowSpec.arguments?.parameters ?? [];
		expect(params).toHaveLength(1);
		expect(params[0]).toEqual({ name: 'inputPath', value: '/data/in' });

		// Check that the workflow metadata labels include the template name
		expect(workflow.spec.workflowSpec.workflowMetadata?.labels).toHaveProperty(
			'customSetWorkflowTemplateName',
			'sync-template',
		);

		expect(workflow.spec.workflowSpec.retryStrategy.limit).toBe(5);
		expect(workflow.spec.workflowSpec.retryStrategy.backoff.duration).toBe('10');
		expect(workflow.spec.workflowSpec.retryStrategy.backoff.factor).toBe(2);
		expect(workflow.spec.workflowSpec.retryStrategy.backoff.cap).toBe('60');
		expect(workflow.spec.workflowSpec.retryStrategy.backoff.maxDuration).toBe('300');
	});

	it('Throws error on missing name', () => {
		const builder = new ArgoCronWorkflowBuilder();
		builder.setSchedule('0 2 * * *').setTemplateRef('tpl');
		expect(() => builder.build()).toThrow('Workflow name is required');
	});

	it('Throws error on missing schedule', () => {
		const builder = new ArgoCronWorkflowBuilder();
		builder.setName('no-schedule').setTemplateRef('tpl');
		expect(() => builder.build()).toThrow('Schedule is required');
	});

	it('Throws error on missing template ref', () => {
		const builder = new ArgoCronWorkflowBuilder();
		builder.setName('no-template').setSchedule('0 2 * * *');
		expect(() => builder.build()).toThrow('Workflow template reference name is required');
	});

	it('Adds multiple params correctly', () => {
		const builder = new ArgoCronWorkflowBuilder();
		const params = [
			{ name: 'a', value: '1' },
			{ name: 'b', value: '2' },
		];
		const workflow = builder
			.setName('with-params')
			.setSchedule('0 3 * * *')
			.setTemplateRef('tpl')
			.addParameters(params)
			.build();

		const got = workflow.spec.workflowSpec.arguments?.parameters ?? [];
		expect(got).toHaveLength(2);
		expect(got).toEqual(expect.arrayContaining(params));
	});

	it('Merge multiple labels correctly', () => {
		const builder = new ArgoCronWorkflowBuilder();
		const workflow = builder
			.setName('lbl-test')
			.setSchedule('0 4 * * *')
			.setTemplateRef('tpl')
			.addLabel('team', 'data')
			.addLabels({ region: 'eu', managed: 'true' })
			.build();

		expect(workflow.metadata.labels).toMatchObject({
			'managed-by': 'biomed-management-ui',
			team: 'data',
			region: 'eu',
			managed: 'true',
		});
	});

	// --- New tests for addRetryStrategy validations ---
	it('Sets retry strategy with backoff correctly when valid', () => {
		const builder = new ArgoCronWorkflowBuilder();
		const workflow = builder
			.setName('retry-valid')
			.setSchedule('0 5 * * *')
			.setTemplateRef('tpl')
			.addRetryStrategy({
				retries: 3,
				backoffDuration: 5,
				backoffFactor: 2,
				backoffCap: 20,
				backoffMaxDuration: 60,
			})
			.build();

		expect(workflow.spec.workflowSpec.retryStrategy.limit).toBe(3);
		expect(workflow.spec.workflowSpec.retryStrategy.backoff.duration).toBe('5');
		expect(workflow.spec.workflowSpec.retryStrategy.backoff.factor).toBe(2);
		expect(workflow.spec.workflowSpec.retryStrategy.backoff.cap).toBe('20');
		expect(workflow.spec.workflowSpec.retryStrategy.backoff.maxDuration).toBe('60');
	});

	it('Throws error on negative retries', () => {
		const builder = new ArgoCronWorkflowBuilder();
		expect(() => builder.addRetryStrategy({ retries: -1 })).toThrow(
			'Retries must be a non-negative integer',
		);
	});

	it('Throws when backoff fields are set without duration', () => {
		const builder = new ArgoCronWorkflowBuilder();
		expect(() => builder.addRetryStrategy({ retries: 1, backoffFactor: 2 })).toThrow(
			'Backoff duration must be set if other backoff parameters are set',
		);
		expect(() => builder.addRetryStrategy({ retries: 1, backoffCap: 10 })).toThrow(
			'Backoff duration must be set if other backoff parameters are set',
		);
		expect(() => builder.addRetryStrategy({ retries: 1, backoffMaxDuration: 30 })).toThrow(
			'Backoff duration must be set if other backoff parameters are set',
		);
	});

	it('Throws on negative backoff values', () => {
		const builder = new ArgoCronWorkflowBuilder();
		expect(() => builder.addRetryStrategy({ retries: 1, backoffDuration: -5 })).toThrow(
			'Backoff duration must be a non-negative integer',
		);
		expect(() =>
			builder.addRetryStrategy({ retries: 1, backoffDuration: 1, backoffFactor: -2 }),
		).toThrow('Backoff factor must be a non-negative number');
		expect(() =>
			builder.addRetryStrategy({ retries: 1, backoffDuration: 1, backoffCap: -1 }),
		).toThrow('Backoff cap must be a non-negative integer');
		expect(() =>
			builder.addRetryStrategy({ retries: 1, backoffDuration: 1, backoffMaxDuration: -10 }),
		).toThrow('Backoff max duration must be a non-negative integer');
	});

	it('Throws when cap or maxDuration is smaller than duration', () => {
		const builder = new ArgoCronWorkflowBuilder();
		// cap < duration
		expect(() =>
			builder.addRetryStrategy({ retries: 1, backoffDuration: 10, backoffCap: 5 }),
		).toThrow('backoff.cap must be greater than or equal to backoff.duration');
		// maxDuration < duration
		expect(() =>
			builder.addRetryStrategy({ retries: 1, backoffDuration: 10, backoffMaxDuration: 9 }),
		).toThrow('backoff.maxDuration must be greater than or equal to backoff.duration');
	});
});
