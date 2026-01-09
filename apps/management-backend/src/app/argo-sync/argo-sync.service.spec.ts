import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArgoClientService } from '../argo-client/argo-client.service';
import { CrawlerTemplateDto } from '../crawler-templates/dto/crawler-template.dto';
import { ScheduleDto } from '../schedules/dto/schedule.dto';
import { ScheduleEntity } from '../schedules/entity/schedule.entity';
import { ScheduleErrorType } from '../schedules/enums/schedule-error-type.enum';
import { SchedulesService } from '../schedules/schedules.service';
import { ArgoSyncService } from './argo-sync.service';

type MockFn = ReturnType<typeof vi.fn>;

describe('ArgoSyncService methods: handleScheduleTemplateCheck & compareParamsAndUpdateErrors', () => {
	let service: ArgoSyncService;
	let argoClientMock: {
		getCrawlerTemplateByNameAndNamespace: MockFn;
		getScheduleByNameAndNamespace: MockFn;
	};
	let schedulesServiceMock: {
		getAllScheduleEntities: MockFn;
		addScheduleError: MockFn;
		removeScheduleError: MockFn;
	};
	let configServiceMock: { get: MockFn };

	beforeEach(() => {
		argoClientMock = {
			getCrawlerTemplateByNameAndNamespace: vi.fn(),
			getScheduleByNameAndNamespace: vi.fn(),
		};

		schedulesServiceMock = {
			getAllScheduleEntities: vi.fn(),
			addScheduleError: vi.fn(),
			removeScheduleError: vi.fn(),
		};

		configServiceMock = {
			get: vi.fn().mockReturnValue(true),
		};

		service = new ArgoSyncService(
			configServiceMock as unknown as ConfigService,
			argoClientMock as unknown as ArgoClientService,
			schedulesServiceMock as unknown as SchedulesService,
		);
	});

	function makeScheduleEntity(overrides: Partial<ScheduleEntity> = {}): ScheduleEntity {
		return Object.assign(
			{
				name: 's1',
				namespace: 'ns',
				crawlerTemplateName: 'tmpl',
				lastCheckedTemplateVersionLabel: null,
			},
			overrides,
		) as ScheduleEntity;
	}

	function makeTemplate(paramNames: string[], version = 'v1'): CrawlerTemplateDto {
		return {
			name: 'test-template',
			namespace: 'test-namespace',
			parameters: paramNames.map((n) => ({ name: n })),
			templateVersion: version,
			createdAt: new Date(),
		} as CrawlerTemplateDto;
	}

	function makeArgoSchedule(paramNames: string[]): ScheduleDto {
		return {
			createdAt: new Date(),
			statistics: {
				successfulRuns: 0,
				failedRuns: 0,
			},
			name: 's1',
			namespace: 'ns',
			parameters: paramNames.map((n) => ({ name: n, value: 'dummy' })),
			crawlerTemplateName: 'test-template',
			schedule: '0 0 * * *',
			suspended: false,
		} as ScheduleDto;
	}

	it('compareParamsAndUpdateErrors: removes error on exact match', async () => {
		const localSchedule = makeScheduleEntity();
		const template = makeTemplate(['a', 'b']);
		const argoSchedule = makeArgoSchedule(['a', 'b']);

		await service.compareParamsAndUpdateErrors(localSchedule, template, argoSchedule);

		expect(schedulesServiceMock.removeScheduleError).toHaveBeenCalledWith(
			localSchedule.name,
			localSchedule.namespace,
			ScheduleErrorType.PARAMETER_MISMATCH,
		);
		expect(schedulesServiceMock.addScheduleError).not.toHaveBeenCalled();
	});

	it('compareParamsAndUpdateErrors: adds error for missing params', async () => {
		const localSchedule = makeScheduleEntity();
		const template = makeTemplate(['a', 'b', 'c']);
		const argoSchedule = makeArgoSchedule(['a']);

		await service.compareParamsAndUpdateErrors(localSchedule, template, argoSchedule);

		expect(schedulesServiceMock.addScheduleError).toHaveBeenCalled();
		const call = schedulesServiceMock.addScheduleError.mock.calls[0];
		expect(call[2]).toBe(ScheduleErrorType.PARAMETER_MISMATCH);
		const details = (call[3] as { details: string }).details;
		expect(details).toContain('Missing parameters');
		expect(details).toContain('b');
		expect(details).toContain('c');
	});

	it('compareParamsAndUpdateErrors: adds error for extra params', async () => {
		const localSchedule = makeScheduleEntity();
		const template = makeTemplate(['a']);
		const argoSchedule = makeArgoSchedule(['a', 'extra']);

		await service.compareParamsAndUpdateErrors(localSchedule, template, argoSchedule);

		expect(schedulesServiceMock.addScheduleError).toHaveBeenCalled();
		const call = schedulesServiceMock.addScheduleError.mock.calls[0];
		expect(call[2]).toBe(ScheduleErrorType.PARAMETER_MISMATCH);
		const details = (call[3] as { details: string }).details;
		expect(details).toContain('Extra parameters');
		expect(details).toContain('extra');
	});

	it('compareParamsAndUpdateErrors: combined message when both missing and extra', async () => {
		const localSchedule = makeScheduleEntity();
		const template = makeTemplate(['a', 'c']);
		const argoSchedule = makeArgoSchedule(['a', 'b']);

		await service.compareParamsAndUpdateErrors(localSchedule, template, argoSchedule);

		expect(schedulesServiceMock.addScheduleError).toHaveBeenCalled();
		const call = schedulesServiceMock.addScheduleError.mock.calls[0];
		const details = (call[3] as { details: string }).details;
		expect(details).toContain('Missing parameters');
		expect(details).toContain('c');
		expect(details).toContain('Extra parameters');
		expect(details).toContain('b');
	});

	it('handleScheduleTemplateCheck: sets TEMPLATE_NOT_FOUND when template missing', async () => {
		const localSchedule = makeScheduleEntity();
		argoClientMock.getCrawlerTemplateByNameAndNamespace.mockResolvedValue(undefined);

		await service.handleScheduleTemplateCheck(localSchedule);

		expect(schedulesServiceMock.addScheduleError).toHaveBeenCalled();
		const call = schedulesServiceMock.addScheduleError.mock.calls[0];
		expect(call[2]).toBe(ScheduleErrorType.TEMPLATE_NOT_FOUND);
		expect((call[3] as { details: string }).details).toContain(localSchedule.crawlerTemplateName);
	});

	it('handleScheduleTemplateCheck: skips further checks if template version already checked', async () => {
		const localSchedule = makeScheduleEntity({ lastCheckedTemplateVersionLabel: 'v1' });
		argoClientMock.getCrawlerTemplateByNameAndNamespace.mockResolvedValue(makeTemplate([], 'v1'));

		await service.handleScheduleTemplateCheck(localSchedule);

		expect(schedulesServiceMock.removeScheduleError).toHaveBeenCalledWith(
			localSchedule.name,
			localSchedule.namespace,
			ScheduleErrorType.TEMPLATE_NOT_FOUND,
		);
		expect(argoClientMock.getScheduleByNameAndNamespace).not.toHaveBeenCalled();
	});

	it('handleScheduleTemplateCheck: skips when argo schedule missing', async () => {
		const localSchedule = makeScheduleEntity();
		argoClientMock.getCrawlerTemplateByNameAndNamespace.mockResolvedValue(makeTemplate(['a']));
		argoClientMock.getScheduleByNameAndNamespace.mockResolvedValue(undefined);

		await service.handleScheduleTemplateCheck(localSchedule);

		expect(schedulesServiceMock.removeScheduleError).toHaveBeenCalledWith(
			localSchedule.name,
			localSchedule.namespace,
			ScheduleErrorType.TEMPLATE_NOT_FOUND,
		);
		// No PARAMETER_MISMATCH should have been added
		expect(schedulesServiceMock.addScheduleError).not.toHaveBeenCalledWith(
			localSchedule.name,
			localSchedule.namespace,
			ScheduleErrorType.PARAMETER_MISMATCH,
			expect.anything(),
		);
	});

	it('handleScheduleTemplateCheck: delegates to compareParamsAndUpdateErrors and sets PARAMETER_MISMATCH when mismatch', async () => {
		const localSchedule = makeScheduleEntity();
		argoClientMock.getCrawlerTemplateByNameAndNamespace.mockResolvedValue(makeTemplate(['a', 'b']));
		argoClientMock.getScheduleByNameAndNamespace.mockResolvedValue(makeArgoSchedule(['a']));

		await service.handleScheduleTemplateCheck(localSchedule);

		// template-not-found should have been cleared
		expect(schedulesServiceMock.removeScheduleError).toHaveBeenCalledWith(
			localSchedule.name,
			localSchedule.namespace,
			ScheduleErrorType.TEMPLATE_NOT_FOUND,
		);
		// parameter mismatch should have been added
		expect(schedulesServiceMock.addScheduleError).toHaveBeenCalledWith(
			localSchedule.name,
			localSchedule.namespace,
			ScheduleErrorType.PARAMETER_MISMATCH,
			expect.any(Object),
		);
	});
});
