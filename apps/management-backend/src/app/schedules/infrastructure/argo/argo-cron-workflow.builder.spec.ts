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
			'workflow-template-name',
			'sync-template',
		);
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
});
