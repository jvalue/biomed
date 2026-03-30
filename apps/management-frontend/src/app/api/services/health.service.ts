import { SystemHealthStatusDto } from '@/src/app/api/dto/health/systemHealthStatus.dto';
import { TargetUrlStatusDto } from '@/src/app/api/dto/health/targets/targetUrlStatus.dto';
import { managementBackendClient } from '../management-backend-client';

export const healthService = {
	getSystemHealthStatus: async (): Promise<SystemHealthStatusDto> => {
		const response = await managementBackendClient.get<SystemHealthStatusDto>('/health/system');
		return response.data;
	},

	getTargetHealthStatus: async (): Promise<TargetUrlStatusDto[]> => {
		const response = await managementBackendClient.get<TargetUrlStatusDto[]>('/health/targets');
		return response.data;
	},

	getTargetHealthForSchedule: async (
		namespace: string,
		name: string,
	): Promise<TargetUrlStatusDto[]> => {
		const path = `/health/targets/schedules/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
		const response = await managementBackendClient.get<TargetUrlStatusDto[]>(path);
		return response.data;
	},
};
