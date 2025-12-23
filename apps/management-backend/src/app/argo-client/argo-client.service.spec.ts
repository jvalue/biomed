import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { EnvironmentVariables } from '../env.validation';
import { ArgoAuthService } from './argo-auth/argo-auth.service';
import { ArgoClientService } from './argo-client.service';
import { ArgoCronWorkflowDto } from './dto/cron-workflows/argo-cron-workflow.dto';

describe('ArgoClientService.filterCronWorkflowsReferencingWorkflowTemplates', () => {
	const mockArgoAuthService = { getAuthToken: () => 'fake-token' } as unknown as ArgoAuthService;
	const mockConfigService = {
		get: (_key: string) => 'http://localhost',
	} as unknown as ConfigService<EnvironmentVariables, true>;
	const service = new ArgoClientService(mockArgoAuthService, mockConfigService);

	it('keeps only cron workflows with defined workflowTemplateRef.name (empty string is not accepted)', () => {
		const cronWorkflows = [
			{
				metadata: { name: 'c1' },
				spec: { workflowSpec: { workflowTemplateRef: { name: 'awesome-dragon' } } },
			},
			{ metadata: { name: 'c2' }, spec: { workflowSpec: { workflowTemplateRef: undefined } } },
			{
				metadata: { name: 'c3' },
				spec: { workflowSpec: { workflowTemplateRef: { name: undefined } } },
			},
			{ metadata: { name: 'c4' }, spec: { workflowSpec: { workflowTemplateRef: { name: '' } } } },
		] as ArgoCronWorkflowDto[];

		const result = service.filterCronWorkflowsReferencingWorkflowTemplates(cronWorkflows);
		const names = result.map((r) => r.metadata.name);

		expect(result).toHaveLength(1);
		expect(names).toContain('c1');
	});

	it('returns an empty array when given an empty list', () => {
		const result = service.filterCronWorkflowsReferencingWorkflowTemplates([]);
		expect(result).toEqual([]);
	});
});
