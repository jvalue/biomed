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
		return this.argoClientService.listCronWorkflows();
	}
}
