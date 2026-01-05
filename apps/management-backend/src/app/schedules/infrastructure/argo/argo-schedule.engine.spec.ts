import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArgoClientService } from '../../../argo-client/argo-client.service';
import { UserEntity } from '../../../users/entity/user.entity';
import { CreateScheduleDto } from '../../dto/create-schedule.dto';
import { ArgoScheduleEngine } from './argo-schedule.engine';

describe('ArgoScheduleEngine', () => {
	let engine: ArgoScheduleEngine;
	let argoClientMock: { createSchedule: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		vi.restoreAllMocks();
		argoClientMock = {
			createSchedule: vi.fn().mockResolvedValue(undefined),
		};
		engine = new ArgoScheduleEngine(argoClientMock as unknown as ArgoClientService);
	});

	it('calls ArgoClientService.createSchedule with expected CronWorkflow object and namespace', async () => {
		// Arrange
		const dto: CreateScheduleDto = {
			name: 'nightly-sync',
			cronExpression: '0 2 * * *',
			crawlerTemplateName: 'sync-template',
			crawlerTemplateNamespace: 'argo-managed-crawler',
			parameters: [{ name: 'inputPath', value: '/data/in' }],
		};

		const user = { id: 'user-123', username: 'jdoe' } as UserEntity;

		// Act
		await engine.createSchedule(dto, user);

		// Assert
		expect(argoClientMock.createSchedule).toHaveBeenCalledTimes(1);
		const calledArgs = argoClientMock.createSchedule.mock.calls[0];
		const passedWorkflow = calledArgs[0];
		const passedNamespace = calledArgs[1];

		expect(passedNamespace).toBe(dto.crawlerTemplateNamespace);

		expect(passedWorkflow).toBeDefined();
		expect(passedWorkflow).toMatchObject({
			metadata: {
				name: dto.name,
				labels: {
					'created-by': user.id,
					'created-by-fallback': user.username,
				},
			},
			spec: {
				schedules: [dto.cronExpression],
				workflowSpec: {
					workflowTemplateRef: {
						name: dto.crawlerTemplateName,
					},
					arguments: {
						parameters: [{ name: 'inputPath', value: '/data/in' }],
					},
				},
			},
		});
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
