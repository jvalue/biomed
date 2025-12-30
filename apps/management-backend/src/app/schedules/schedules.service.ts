import { Injectable } from '@nestjs/common';
import { ArgoClientService } from '../argo-client/argo-client.service';
import { ScheduleDto } from './dto/schedule.dto';

@Injectable()
export class SchedulesService {
	constructor(private readonly argoClientService: ArgoClientService) {}

	/**
	 * Lists all Schedules
	 */
	async listSchedules(): Promise<ScheduleDto[]> {
		return this.argoClientService.listSchedules();
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
}
