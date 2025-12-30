import { CreateScheduleDto } from '@/src/app/api/dto/schedule/create-schedule.dto';
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

	/**
	 * Create a new schedule
	 * @param createScheduleDto
	 * @returns The link to the created PR of the schedule
	 */
	createSchedule: async (createScheduleDto: CreateScheduleDto): Promise<string> => {
		const { data } = await managementBackendClient.post('schedules', createScheduleDto);
		return data;
	},

	/**
	 * Suspend a schedule
	 * @param name
	 * @param namespace
	 */
	suspendSchedule: async (name: string, namespace: string): Promise<void> => {
		const path = `schedules/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/suspend`;
		await managementBackendClient.patch(path);
	},

	/**
	 * Resume a schedule
	 * @param name
	 * @param namespace
	 */
	resumeSchedule: async (name: string, namespace: string): Promise<void> => {
		const path = `schedules/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/resume`;
		await managementBackendClient.patch(path);
	},
};
