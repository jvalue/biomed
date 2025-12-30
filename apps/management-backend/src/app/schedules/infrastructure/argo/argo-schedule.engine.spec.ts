import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserEntity } from '../../../users/entity/user.entity';
import { CreateScheduleDto } from '../../dto/create-schedule.dto';
import { ArgoScheduleEngine } from './argo-schedule.engine';

describe('ArgoScheduleEngine', () => {
	let engine: ArgoScheduleEngine;

	beforeEach(() => {
		engine = new ArgoScheduleEngine();
		vi.restoreAllMocks();
	});

	it('creates a PR and includes expected labels and template name in generated YAML', async () => {
		// Arrange
		const dto: CreateScheduleDto = {
			name: 'nightly-sync',
			cronExpression: '0 2 * * *',
			crawlerTemplateName: 'sync-template',
			crawlerTemplateNamespace: 'argo-managed-crawler',
			parameters: [{ name: 'inputPath', value: '/data/in' }],
		};

		const user = { id: 'user-123', username: 'jdoe' } as UserEntity;

		// Spy / mock the private PR creation to capture arguments and return a URL
		const prUrl = 'http://mock-repo/pull-requests/nightly-sync';
		const prSpy = vi.spyOn(engine, 'createPullRequest').mockResolvedValue(prUrl);

		// Act
		const result = await engine.createSchedule(dto, user);

		// Assert
		expect(result).toBe(prUrl);
		expect(prSpy).toHaveBeenCalled();

		const calledArgs = prSpy.mock.calls[0];
		expect(calledArgs[0]).toBe(dto.name); // filename

		const yamlContent = calledArgs[1] as string;
		// Check for important bits in the YAML output
		expect(yamlContent).toContain(`name: ${dto.name}`);
		expect(yamlContent).toContain('0 2 * * *'); // schedule present
		expect(yamlContent).toContain(`workflow-template-name: ${dto.crawlerTemplateName}`);
		expect(yamlContent).toContain(`created-by: ${user.id}`);
		expect(yamlContent).toContain(`created-by-fallback: ${user.username}`);
		// parameter included
		expect(yamlContent).toContain('inputPath');
		expect(yamlContent).toContain('/data/in');
	});

	it('propagates builder validation error when template name is missing', async () => {
		// Arrange: missing workflowTemplateName
		const dto: CreateScheduleDto = {
			name: 'no-template',
			cronExpression: '0 2 * * *',
			crawlerTemplateName: '', // missing
			parameters: [],
			crawlerTemplateNamespace: 'argo-managed-crawler',
		};
		const user = { id: 'u', username: 'u' } as UserEntity;

		// Act & Assert
		await expect(engine.createSchedule(dto, user)).rejects.toThrow(
			'Workflow template reference name is required',
		);
	});
});
