import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CrawlerRunDto } from '../../crawler-runs/dto/crawler-run.dto';
import { EnvironmentVariables } from '../../env.validation';
import { ScheduleDto } from '../../schedules/dto/schedule.dto';
import { ArgoAuthService } from './argo-auth/argo-auth.service';
import { ArgoClientService } from './argo-client.service';
import { ArgoCronWorkflowDto } from './dto/cron-workflows/argo-cron-workflow.dto';

afterEach(() => {
	vi.restoreAllMocks();
	vi.clearAllMocks();
});

const mockArgoAuthService = { getAuthToken: () => 'fake-token' } as unknown as ArgoAuthService;
const mockConfigService = {
	get: (_key: string) => 'http://localhost',
} as unknown as ConfigService<EnvironmentVariables, true>;
const service = new ArgoClientService(mockArgoAuthService, mockConfigService);

describe('ArgoClientService.filterCronWorkflowsReferencingWorkflowTemplates', () => {
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

describe('ArgoClientService.enrichWorkflowRunWithCronWorkflowTemplateName', () => {
	it(
		'sets workflowTemplateName when run has scheduleName and schedule exists but workflowTemplateName is' +
			' undefined',
		async () => {
			const run = { name: 'r1', namespace: 'ns1', scheduleName: 's1' } as CrawlerRunDto;

			vi.spyOn(service, 'getScheduleByNameAndNamespace').mockResolvedValueOnce({
				crawlerTemplateName: 'awesome-dragon',
			} as unknown as ScheduleDto);

			const result = await service.enrichWorkflowRunWithCronWorkflowTemplateName(run);

			expect(service.getScheduleByNameAndNamespace).toHaveBeenCalledWith('s1', 'ns1');
			expect(result.crawlerTemplateName).toBe('awesome-dragon');
		},
	);

	it('doesnt call the lookup when schedule name is undefined', async () => {
		const run = { name: 'r2', namespace: 'ns2', scheduleName: undefined } as CrawlerRunDto;

		const spy = vi.spyOn(service, 'getScheduleByNameAndNamespace').mockResolvedValueOnce(null);

		const result = await service.enrichWorkflowRunWithCronWorkflowTemplateName(run);

		expect(spy).not.toHaveBeenCalled();
		expect(result.crawlerTemplateName).toBeUndefined();
	});

	it('keeps workflowTemplateName undefined when schedule lookup returns null', async () => {
		const run = { name: 'r3', namespace: 'ns3', scheduleName: 'missing-schedule' } as CrawlerRunDto;

		vi.spyOn(service, 'getScheduleByNameAndNamespace').mockResolvedValueOnce(null);

		const result = await service.enrichWorkflowRunWithCronWorkflowTemplateName(run);

		expect(service.getScheduleByNameAndNamespace).toHaveBeenCalledWith('missing-schedule', 'ns3');
		expect(result.crawlerTemplateName).toBeUndefined();
	});

	it('keeps workflowTemplateName when set', async () => {
		const run = {
			name: 'r4',
			namespace: 'ns4',
			scheduleName: 's4',
			crawlerTemplateName: 'predefined-template',
		} as CrawlerRunDto;

		const spy = vi.spyOn(service, 'getScheduleByNameAndNamespace');

		const result = await service.enrichWorkflowRunWithCronWorkflowTemplateName(run);

		expect(spy).not.toHaveBeenCalled();
		expect(result.crawlerTemplateName).toBe('predefined-template');
	});
});
