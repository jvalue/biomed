import { managementBackendClient } from '../management-backend-client';

export const workflowService = {
	getWorkflowRuns: async () => {
		const { data } = await managementBackendClient.get('/demo/workflows');
		console.log(data);
		return data;
	},
};
