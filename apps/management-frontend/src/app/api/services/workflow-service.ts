import { managementBackendClient } from '../management-backend-client';

export const workflowService = {
	getWorkflowRuns: async () => {
		const { data } = await managementBackendClient.get('workflow-runs');
		console.log(data);
		return data;
	},
};
