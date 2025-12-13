import { WorkflowTemplateDto } from '@/src/app/api/dto/workflow-template/workflow-template.dto';
import { managementBackendClient } from '../management-backend-client';

export const workflowTemplateService = {
	getWorkflowTemplates: async (): Promise<WorkflowTemplateDto[]> => {
		const { data } = await managementBackendClient.get('workflow-templates');
		return data;
	},
};
