import { Inject, Injectable } from '@nestjs/common';
import { ArgoClientService } from '../argo-client/argo-client.service';
import { UserEntity } from '../users/entity/user.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleDto } from './dto/schedule.dto';
import { IScheduleEngine, SCHEDULE_ENGINE } from './schedule-engine.interface';

@Injectable()
export class SchedulesService {
	constructor(
		@Inject(SCHEDULE_ENGINE)
		private readonly scheduleEngine: IScheduleEngine,
		private readonly argoClientService: ArgoClientService,
	) {}

	/**
	 * Lists all Schedules
	 */
	async listSchedules(): Promise<ScheduleDto[]> {
		const schedules = await this.argoClientService.listSchedules();
		// Sort schedules primary by suspended status, then by creation date
		schedules.sort((a, b) => {
			if (a.suspended && !b.suspended) return 1;
			if (!a.suspended && b.suspended) return -1;
			return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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
		return this.scheduleEngine.createSchedule(createScheduleDto, user);
	}

	/**
	 * Suspend a Schedule
	 * @param name The name of the Schedule
	 * @param namespace The namespace of the Schedule
	 */
	async suspendSchedule(name: string, namespace: string): Promise<void> {
		return this.argoClientService.suspendSchedule(name, namespace);
	}

	/**
	 * Resume a Schedule
	 * @param name The name of the Schedule
	 * @param namespace The namespace of the Schedule
	 */
	async resumeSchedule(name: string, namespace: string): Promise<void> {
		return this.argoClientService.resumeSchedule(name, namespace);
	}
}
