import { CreateScheduleDto } from '@/src/app/api/dto/schedule/create-schedule.dto';
import { ScheduleHistoricalMetricsItemDto } from '@/src/app/api/dto/schedule/metrics/schedule-historical-metrics-item.dto';
import { ScheduleOverallMetricsDto } from '@/src/app/api/dto/schedule/metrics/schedule-overall-metrics.dto';
import { ScheduleDto } from '@/src/app/api/dto/schedule/schedule.dto';
import { UpdateScheduleDto } from '@/src/app/api/dto/schedule/update-schedule.dto';
import { managementBackendClient } from '../management-backend-client';

export const scheduleService = {
	getSchedules: async (): Promise<ScheduleDto[]> => {
		const { data } = await managementBackendClient.get('schedules');
		return data;
	},

	getScheduleByNamespaceAndName: async (namespace: string, name: string): Promise<ScheduleDto> => {
		const path = `schedules/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
		const { data } = await managementBackendClient.get(path);
		return data;
	},

	scheduleNameExists: async (namespace: string, name: string): Promise<boolean> => {
		const path = `schedules/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/exists`;
		const { data } = await managementBackendClient.get<boolean>(path);
		return data;
	},

	/**
	 * Create a new schedule
	 * @param createScheduleDto
	 */
	createSchedule: async (createScheduleDto: CreateScheduleDto): Promise<void> => {
		await managementBackendClient.post('schedules', createScheduleDto);
	},

	/**
	 * Update a schedule
	 * @param namespace
	 * @param name
	 * @param updateScheduleDto
	 */
	updateSchedule: async (
		namespace: string,
		name: string,
		updateScheduleDto: UpdateScheduleDto,
	): Promise<void> => {
		const path = `schedules/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
		await managementBackendClient.patch(path, updateScheduleDto);
	},

	/**
	 * Delete a schedule
	 * @param namespace
	 * @param name
	 */
	deleteSchedule: async (namespace: string, name: string): Promise<void> => {
		const path = `schedules/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
		await managementBackendClient.delete(path);
	},

	/**
	 * Suspend a schedule
	 * @param namespace
	 * @param name
	 */
	suspendSchedule: async (namespace: string, name: string): Promise<void> => {
		const path = `schedules/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/suspend`;
		await managementBackendClient.patch(path);
	},

	/**
	 * Resume a schedule
	 * @param namespace
	 * @param name
	 */
	resumeSchedule: async (namespace: string, name: string): Promise<void> => {
		const path = `schedules/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/resume`;
		await managementBackendClient.patch(path);
	},

	/**
	 * Get schedules metrics history
	 * @param namespace
	 * @param name
	 * @param fromDate
	 * @param toDate
	 * @return metrics history data
	 */
	getScheduleMetricsHistory: async (
		namespace: string,
		name: string,
		fromDate?: Date,
		toDate?: Date,
	): Promise<ScheduleHistoricalMetricsItemDto[]> => {
		const path = `schedules/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/metrics/history`;
		const params: {
			from?: string;
			to?: string;
		} = {};
		if (fromDate) {
			params.from = fromDate.toISOString();
		}
		if (toDate) {
			params.to = toDate.toISOString();
		}
		const { data } = await managementBackendClient.get(path, { params });
		return data;
	},

	/**
	 * Get schedules metrics summary
	 * @param namespace
	 * @param name
	 * @return metrics summary data
	 */
	getScheduleMetricsSummary: async (
		namespace: string,
		name: string,
	): Promise<ScheduleOverallMetricsDto> => {
		const path = `schedules/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/metrics/aggregated`;
		const { data } = await managementBackendClient.get(path);
		return data;
	},
};
