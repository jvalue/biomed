import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TargetEntity } from '../health/targets/entity/target.entity';
import { TargetsService } from '../health/targets/targets.service';
import { ArgoClientService } from '../orchestrator-client/argo-client/argo-client.service';
import { UserEntity } from '../users/entity/user.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleDto, ScheduleParameterDto } from './dto/schedule.dto';
import { ScheduleEntity } from './entity/schedule.entity';
import { ScheduleErrorDetails, ScheduleErrorType } from './enums/schedule-error-type.enum';
import type { IScheduleEngine } from './schedule-engine.interface';
import { SCHEDULE_ENGINE } from './schedule-engine.interface';

@Injectable()
export class SchedulesService {
	private readonly logger = new Logger(SchedulesService.name);

	constructor(
		@InjectRepository(ScheduleEntity)
		private readonly scheduleRepository: Repository<ScheduleEntity>,
		@Inject(SCHEDULE_ENGINE)
		private readonly scheduleEngine: IScheduleEngine,
		private readonly orchestratorClientService: ArgoClientService,
		private readonly targetsService: TargetsService,
	) {}

	private readonly VALID_TARGET_PARAM_NAMES = ['targetUrl', 'target'];

	/**
	 * Lists all Schedules
	 */
	async listSchedules(): Promise<ScheduleDto[]> {
		const schedules = await this.orchestratorClientService.listSchedules();

		// Enrich schedules with local data
		await Promise.all(schedules.map((schedule) => this.enrichScheduleDtoWithLocalData(schedule)));

		// Sort schedules primary by suspended status, then by creation date (newest first)
		schedules.sort((a, b) => {
			if (a.suspended && !b.suspended) return 1;
			if (!a.suspended && b.suspended) return -1;
			// descending by createdAt: newer first
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		});
		return schedules;
	}

	/**
	 * Get all schedule entites from the local database (for internal use)
	 */
	async getAllScheduleEntities(): Promise<ScheduleEntity[]> {
		return this.scheduleRepository.find();
	}

	/**
	 * Adds error to the activeErrors of a schedule
	 * @param name The name of the Schedule
	 * @param namespace The namespace of the Schedule
	 * @param errorType The type of the error
	 * @param details The details of the error
	 */
	async addScheduleError(
		name: string,
		namespace: string,
		errorType: ScheduleErrorType,
		details: ScheduleErrorDetails,
	): Promise<void> {
		const schedule = await this.scheduleRepository.findOne({ where: { name, namespace } });
		if (!schedule) {
			this.logger.warn(
				`Cannot add error to non-existing schedule ${name} in namespace ${namespace}`,
			);
			return;
		}

		// Add or update the error
		schedule.activeErrors[errorType] = details;
		await this.scheduleRepository.save(schedule);
	}

	/**
	 * Removes error from the activeErrors of a schedule
	 * @param name The name of the Schedule
	 * @param namespace The namespace of the Schedule
	 * @param errorType The type of the error
	 */
	async removeScheduleError(
		name: string,
		namespace: string,
		errorType: ScheduleErrorType,
	): Promise<void> {
		const schedule = await this.scheduleRepository.findOne({ where: { name, namespace } });
		if (!schedule) {
			this.logger.warn(
				`Cannot remove error from non-existing schedule ${name} in namespace ${namespace}`,
			);
			return;
		}

		// Remove the error
		delete schedule.activeErrors[errorType];
		await this.scheduleRepository.save(schedule);
	}

	/**
	 * Gets a Schedule by name and namespace
	 * @param name The name of the Schedule
	 * @param namespace The namespace of the Schedule
	 * @returns The Schedule
	 */
	async getScheduleByNameAndNamespace(name: string, namespace: string): Promise<ScheduleDto> {
		const schedule = await this.orchestratorClientService.getScheduleByNameAndNamespace(
			name,
			namespace,
		);
		await this.enrichScheduleDtoWithLocalData(schedule);
		return schedule;
	}

	/**
	 * Create a new Schedule
	 * @param createScheduleDto The Schedule to create
	 * @param user The user creating the Schedule
	 */
	async createSchedule(createScheduleDto: CreateScheduleDto, user: UserEntity): Promise<void> {
		// Create schedule in the orchestrator
		await this.scheduleEngine.createSchedule(createScheduleDto, user);

		// Save schedule in the local database
		const targets = await this.createTargetsIfNotExist(createScheduleDto.parameters);
		// Create Schedule entity in the database
		const scheduleEntity = new ScheduleEntity();
		scheduleEntity.name = createScheduleDto.name;
		scheduleEntity.namespace = createScheduleDto.crawlerTemplateNamespace;
		scheduleEntity.crawlerTemplateName = createScheduleDto.crawlerTemplateName;
		scheduleEntity.createdBy = user;
		scheduleEntity.targets = targets;
		await this.scheduleRepository.save(scheduleEntity);
	}

	/**
	 * Create Targets if they do not exist based on the target URLs found in the schedule parameters
	 * @param parameters The schedule parameters
	 * @private
	 */
	private async createTargetsIfNotExist(parameters: ScheduleParameterDto[]) {
		// Extract target URLs from schedule parameters
		const targetUrls = this.findAllTargetUrlsInScheduleParams(parameters);
		// Create targets if they do not exist
		const targets: TargetEntity[] = [];
		for (const url of targetUrls) {
			const target = await this.targetsService.createTargetIfNotExists(url);
			if (target) {
				targets.push(target);
			}
		}
		return targets;
	}

	/**
	 * Delete a Schedule
	 * @param name The name of the Schedule
	 * @param namespace The namespace of the Schedule
	 */
	async deleteSchedule(name: string, namespace: string): Promise<void> {
		// Delete schedule in the orchestrator
		await this.orchestratorClientService.deleteSchedule(name, namespace);

		// Delete schedule in the local database
		// Get the schedule with its targets
		const scheduleEntity = await this.scheduleRepository.findOne({
			where: { name, namespace },
			relations: ['targets'],
		});
		await this.scheduleRepository.delete({ name, namespace });
		// Delete orphaned targets (targets not referenced by any schedule)
		if (scheduleEntity?.targets) {
			for (const target of scheduleEntity.targets) {
				await this.targetsService.deleteTargetIfUnreferenced(target.url);
			}
		}
	}

	/**
	 * Suspend a Schedule
	 * @param name The name of the Schedule
	 * @param namespace The namespace of the Schedule
	 */
	async suspendSchedule(name: string, namespace: string): Promise<void> {
		// Suspend in the orchestrator
		await this.orchestratorClientService.suspendSchedule(name, namespace);

		// Update local database
		await this.scheduleRepository.update({ name, namespace }, { suspended: true });
	}

	/**
	 * Resume a Schedule
	 * @param name The name of the Schedule
	 * @param namespace The namespace of the Schedule
	 */
	async resumeSchedule(name: string, namespace: string): Promise<void> {
		// Resume in the orchestrator
		await this.orchestratorClientService.resumeSchedule(name, namespace);

		// Update local database
		await this.scheduleRepository.update({ name, namespace }, { suspended: false });
	}

	/**
	 * Syncs schedules from the orchestrator with the local database
	 * @param schedules all schedules from the orchestrator
	 */
	async syncSchedulesFromOrchestrator(schedules: ScheduleDto[]): Promise<void> {
		const localMap = await this.buildLocalMap();
		await this.processOrchestratorSchedules(schedules, localMap);
		await this.deleteLocalSchedulesNotInOrchestrator(localMap);
	}

	/**
	 * Loads all local schedules once and returns a map keyed by name||namespace
	 */
	private async buildLocalMap(): Promise<Map<string, ScheduleEntity>> {
		const localSchedules = await this.scheduleRepository.find({ relations: ['targets'] });
		const map = new Map<string, ScheduleEntity>();
		for (const local of localSchedules) {
			map.set(`${local.name}||${local.namespace}`, local);
		}
		return map;
	}

	/**
	 * Processes all orchestrator orchestratorSchedules by upserting them into local DB and marking processed locals
	 */
	private async processOrchestratorSchedules(
		orchestratorSchedules: ScheduleDto[],
		localMap: Map<string, ScheduleEntity>,
	): Promise<void> {
		for (const schedule of orchestratorSchedules) {
			await this.upsertScheduleFromOrchestrator(schedule, localMap);
		}
	}

	/**
	 * Deletes remaining local schedules that were not present in the orchestrator
	 */
	private async deleteLocalSchedulesNotInOrchestrator(
		localMap: Map<string, ScheduleEntity>,
	): Promise<void> {
		for (const local of localMap.values()) {
			this.logger.warn(
				`Local schedule ${local.name} in namespace ${local.namespace} not found in orchestrator — deleting from local database.`,
			);
			await this.scheduleRepository.delete({ name: local.name, namespace: local.namespace });
			if (local.targets) {
				for (const target of local.targets) {
					await this.targetsService.deleteTargetIfUnreferenced(target.url);
				}
			}
		}
	}

	/**
	 * Helper: insert or update a single schedule from the orchestrator into the local DB.
	 * Also removes processed local entries from the provided localMap for efficiency reasons.
	 */
	private async upsertScheduleFromOrchestrator(
		schedule: ScheduleDto,
		localMap: Map<string, ScheduleEntity>,
	): Promise<void> {
		const key = `${schedule.name}||${schedule.namespace}`;
		const existingSchedule = localMap.get(key);
		if (!existingSchedule) {
			this.logger.warn(
				`Unknown schedule found in orchestrator, adding to local database: ${schedule.name} in namespace ${schedule.namespace}`,
			);
			const scheduleEntity = new ScheduleEntity();
			scheduleEntity.name = schedule.name;
			scheduleEntity.namespace = schedule.namespace;
			scheduleEntity.crawlerTemplateName = schedule.crawlerTemplateName;
			scheduleEntity.suspended = schedule.suspended;
			scheduleEntity.targets = await this.createTargetsIfNotExist(schedule.parameters);

			await this.scheduleRepository.save(scheduleEntity);
			return;
		}

		// existing: check for inconsistencies and update if necessary
		let needsUpdate = false;
		if (existingSchedule.crawlerTemplateName !== schedule.crawlerTemplateName) {
			this.logger.warn(
				`Inconsistency found for schedule ${schedule.name} in namespace ${schedule.namespace}: crawlerTemplateName differs (orchestrator: ${schedule.crawlerTemplateName}, local: ${existingSchedule.crawlerTemplateName}). Updating local database.`,
			);
			existingSchedule.crawlerTemplateName = schedule.crawlerTemplateName;
			needsUpdate = true;
		}
		if (existingSchedule.suspended !== (schedule.suspended ?? false)) {
			this.logger.warn(
				`Inconsistency found for schedule ${schedule.name} in namespace ${schedule.namespace}: suspended status differs (orchestrator: ${schedule.suspended}, local: ${existingSchedule.suspended}). Updating local database.`,
			);
			existingSchedule.suspended = schedule.suspended;
			needsUpdate = true;
		}
		if (needsUpdate) {
			await this.scheduleRepository.save(existingSchedule);
		}

		// mark as processed by removing from map
		localMap.delete(key);
	}

	/**
	 * Finds all target URLs in the given schedule parameters
	 * @param params
	 */
	private findAllTargetUrlsInScheduleParams(params: ScheduleParameterDto[]): string[] {
		const targetUrls: string[] = [];
		if (!params) {
			return targetUrls;
		}
		for (const param of params) {
			// Check if any params are target URLs
			if (this.VALID_TARGET_PARAM_NAMES.includes(param.name) && param.value) {
				targetUrls.push(param.value);
			}
		}
		return targetUrls;
	}

	/**
	 * Enriches a scheduleDto with additional data from our local database (at the moment only the activeErrors)
	 * @param scheduleDto The schedule to enrich
	 */
	async enrichScheduleDtoWithLocalData(scheduleDto: ScheduleDto): Promise<void> {
		const scheduleEntity = await this.scheduleRepository.findOne({
			where: { name: scheduleDto.name, namespace: scheduleDto.namespace },
		});
		if (scheduleEntity) {
			scheduleDto.activeErrors = scheduleEntity.activeErrors;
		}
	}
}
