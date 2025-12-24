import { ScheduleDto } from '@/src/app/api/dto/schedule/schedule.dto';
import { managementBackendClient } from '../management-backend-client';

export const scheduleService = {
	getSchedules: async (): Promise<ScheduleDto[]> => {
		const { data } = await managementBackendClient.get('schedules');
		return data;
	},
};
