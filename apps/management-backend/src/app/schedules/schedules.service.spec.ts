import 'reflect-metadata';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArgoClientService } from '../argo-client/argo-client.service';
import { TargetEntity } from '../health/targets/entity/target.entity';
import type { TargetsService } from '../health/targets/targets.service';
import type { ScheduleParameterDto } from './dto/schedule.dto';
import { ScheduleEntity } from './entity/schedule.entity';
import type { IScheduleEngine } from './schedule-engine.interface';
import { SchedulesService } from './schedules.service';

describe('SchedulesService - syncTargetsForExistingSchedule', () => {
	let service: SchedulesService;
	type CreateTargetFn = (url: string) => Promise<TargetEntity | undefined>;
	type DeleteTargetFn = (url: string) => Promise<void>;
	type SaveFn = (entity: ScheduleEntity) => Promise<ScheduleEntity>;

	// Helper type: a function type with a `.mock.calls` shape for assertions
	type MockWithCalls<F extends (...args: unknown[]) => unknown> = F & {
		mock: { calls: unknown[][] };
		mockImplementation(fn: (...args: Parameters<F>) => ReturnType<F>): void;
	};

	let scheduleRepo: { save: MockWithCalls<SaveFn> };
	let targetsService: {
		createTargetIfNotExists: MockWithCalls<CreateTargetFn>;
		deleteTargetIfUnreferenced: MockWithCalls<DeleteTargetFn>;
	};

	beforeEach(() => {
		// minimal mocks
		scheduleRepo = {
			save: vi.fn() as unknown as MockWithCalls<SaveFn>,
		};
		targetsService = {
			createTargetIfNotExists: vi.fn() as unknown as MockWithCalls<CreateTargetFn>,
			deleteTargetIfUnreferenced: vi.fn() as unknown as MockWithCalls<DeleteTargetFn>,
		};

		service = new SchedulesService(
			scheduleRepo as unknown as Repository<ScheduleEntity>,
			{} as unknown as IScheduleEngine,
			{} as unknown as ArgoClientService,
			targetsService as unknown as TargetsService,
		);
	});

	it('adds new targets based on parameters', async () => {
		const existingSchedule = new ScheduleEntity();
		existingSchedule.targets = [Object.assign(new TargetEntity(), { url: 'https://a.example' })];

		const newParams: ScheduleParameterDto[] = [
			{ name: 'targetUrl', value: 'https://a.example' },
			{ name: 'targetUrl', value: 'https://b.example' },
		];

		// mock createTargetIfNotExists to return a TargetEntity for b
		const createTargetMock = targetsService.createTargetIfNotExists;
		createTargetMock.mockImplementation(async (url: string) => {
			if (url === 'https://b.example') return Object.assign(new TargetEntity(), { url });
			return undefined;
		});

		await service.syncTargetsForExistingSchedule(existingSchedule, newParams);

		const createCalls = targetsService.createTargetIfNotExists.mock.calls;
		expect(createCalls.some((c) => c[0] === 'https://b.example')).toBe(true);
		expect(existingSchedule.targets.map((t) => t.url)).toEqual(
			expect.arrayContaining(['https://a.example', 'https://b.example']),
		);
		// scheduleRepo.save should have been called once to persist relation change
		const saveCalls = scheduleRepo.save.mock.calls;
		expect(saveCalls.length).toBeGreaterThanOrEqual(1);
	});

	it('removes unreferenced targets and calls deleteTargetIfUnreferenced', async () => {
		const existingSchedule = new ScheduleEntity();
		existingSchedule.targets = [
			Object.assign(new TargetEntity(), { url: 'https://a.example' }),
			Object.assign(new TargetEntity(), { url: 'https://c.example' }),
		];

		const params: ScheduleParameterDto[] = [{ name: 'target', value: 'https://a.example' }];

		await service.syncTargetsForExistingSchedule(existingSchedule, params);

		expect(existingSchedule.targets.map((t) => t.url)).toEqual(['https://a.example']);
		const deleteCalls = targetsService.deleteTargetIfUnreferenced.mock.calls;
		expect(deleteCalls.some((c) => c[0] === 'https://c.example')).toBe(true);
	});
});
