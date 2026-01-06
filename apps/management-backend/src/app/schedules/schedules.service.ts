import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArgoClientService } from '../argo-client/argo-client.service';
import { TargetEntity } from '../health/targets/entity/target.entity';
import { TargetsService } from '../health/targets/targets.service';
import { UserEntity } from '../users/entity/user.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleDto, ScheduleParameterDto } from './dto/schedule.dto';
import { ScheduleEntity } from './entity/schedule.entity';
import type { IScheduleEngine } from './schedule-engine.interface';
import { SCHEDULE_ENGINE } from './schedule-engine.interface';

@Injectable()
export class SchedulesService {
	constructor(
		@InjectRepository(ScheduleEntity)
		private readonly scheduleRepository: Repository<ScheduleEntity>,
		@Inject(SCHEDULE_ENGINE)
		private readonly scheduleEngine: IScheduleEngine,
		private readonly argoClientService: ArgoClientService,
		private readonly targetsService: TargetsService,
	) {}

	/**
	 * Lists all Schedules
	 */
	async listSchedules(): Promise<ScheduleDto[]> {
		const schedules = await this.argoClientService.listSchedules();
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
	 * Gets a Schedule by name and namespace
	 * @param name The name of the Schedule
	 * @param namespace The namespace of the Schedule
	 * @returns The Schedule
	 */
	async getScheduleByNameAndNamespace(name: string, namespace: string): Promise<ScheduleDto> {
		return this.argoClientService.getScheduleByNameAndNamespace(name, namespace);
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
		// Extract target URLs from schedule parameters
		const targetUrls = this.findAllTargetUrlsInScheduleParams(createScheduleDto.parameters);
		// Create targets if they do not exist
		const targets: TargetEntity[] = [];
		for (const url of targetUrls) {
			const target = await this.targetsService.createTargetIfNotExists(url);
			targets.push(target);
		}
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
	 * Delete a Schedule
	 * @param name The name of the Schedule
	 * @param namespace The namespace of the Schedule
	 */
	async deleteSchedule(name: string, namespace: string): Promise<void> {
		// Delete schedule in the orchestrator
		await this.argoClientService.deleteSchedule(name, namespace);

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
		await this.argoClientService.suspendSchedule(name, namespace);

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
		await this.argoClientService.resumeSchedule(name, namespace);

		// Update local database
		await this.scheduleRepository.update({ name, namespace }, { suspended: false });
	}

	findAllTargetUrlsInScheduleParams(params: ScheduleParameterDto[]): string[] {
		const targetUrls: string[] = [];
		if (!params) {
			return targetUrls;
		}
		for (const param of params) {
			if (param.name === 'targetUrl' || (param.name === 'target' && param.value)) {
				targetUrls.push(param.value);
			}
		}
		return targetUrls;
	}
}
