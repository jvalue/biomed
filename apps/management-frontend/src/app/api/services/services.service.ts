import { ServiceDto, ServiceFilterParams } from '@/src/app/api/dto/services/service.dto';
import { managementBackendClient } from '../management-backend-client';

export const servicesService = {
	getServices: async (params: ServiceFilterParams = {}): Promise<ServiceDto[]> => {
		const qs = new URLSearchParams();
		if (params.namespace) qs.set('namespace', params.namespace);
		if (params.serviceType) qs.set('serviceType', params.serviceType);
		if (params.status) qs.set('status', params.status);
		if (params.search) qs.set('search', params.search);

		const path = `services${qs.toString() ? `?${qs.toString()}` : ''}`;
		const { data } = await managementBackendClient.get(path);
		return data;
	},

	getService: async (namespace: string, name: string): Promise<ServiceDto> => {
		const { data } = await managementBackendClient.get(`services/${namespace}/${name}`);
		return data;
	},

	getServiceLogs: async (
		namespace: string,
		name: string,
		podName?: string,
		tailLines = 100,
	): Promise<Array<{ podName: string; logs: string }>> => {
		const qs = new URLSearchParams();
		if (podName) qs.set('podName', podName);
		if (tailLines) qs.set('tailLines', String(tailLines));

		const path = `services/${namespace}/${name}/logs${qs.toString() ? `?${qs.toString()}` : ''}`;
		const { data } = await managementBackendClient.get(path);
		return data;
	},

	abortService: async (namespace: string, name: string): Promise<ServiceDto> => {
		const { data } = await managementBackendClient.post(`services/${namespace}/${name}/abort`);
		return data;
	},

	restartService: async (namespace: string, name: string): Promise<ServiceDto> => {
		const { data } = await managementBackendClient.post(`services/${namespace}/${name}/restart`);
		return data;
	},

	deleteService: async (namespace: string, name: string): Promise<void> => {
		await managementBackendClient.delete(`services/${namespace}/${name}`);
	},
};
