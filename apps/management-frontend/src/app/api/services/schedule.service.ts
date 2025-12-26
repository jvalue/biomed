import { ScheduleDto } from '@/src/app/api/dto/schedule/schedule.dto';
import { managementBackendClient } from '../management-backend-client';

export const scheduleService = {
	getSchedules: async (): Promise<ScheduleDto[]> => {
		const { data } = await managementBackendClient.get('schedules');
		return data;
	},

	getScheduleByNameAndNamespace: async (name: string, namespace: string): Promise<ScheduleDto> => {
		const path = `schedules/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
		const { data } = await managementBackendClient.get(path);
		return data;
	},
};
