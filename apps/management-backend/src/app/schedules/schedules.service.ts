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
		return this.argoClientService.listCronWorkflows();
	}

	/**
	 * Gets a Schedule by name and namespace
	 * @param name The name of the Schedule
	 * @param namespace The namespace of the Schedule
	 * @returns The Schedule
	 */
	async getScheduleByNameAndNamespace(name: string, namespace: string): Promise<ScheduleDto> {
		return this.argoClientService.getCronWorkflowByNameAndNamespace(name, namespace);
	}

	/**
	 * Create a new Schedule
	 * @param createScheduleDto The Schedule to create
	 * @param user The user creating the Schedule
	 * @returns The link to the created PR of the schedule
	 */
	async createSchedule(createScheduleDto: CreateScheduleDto, user: UserEntity): Promise<string> {
		return this.scheduleEngine.createSchedule(createScheduleDto, user);
	}
}
