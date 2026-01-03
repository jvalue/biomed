import { HealthCheckDto } from '@/src/app/api/dto/health/healthCheck.dto';
import { managementBackendClient } from '../management-backend-client';

export const healthService = {
	getHealthStatus: async (): Promise<HealthCheckDto> => {
		const { data } = await managementBackendClient.get('health');
		return data;
	},
};
