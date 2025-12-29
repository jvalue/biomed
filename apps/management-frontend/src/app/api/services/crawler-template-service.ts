import { CrawlerTemplateDto } from '@/src/app/api/dto/workflow-template/crawler-template.dto';
import { managementBackendClient } from '../management-backend-client';

export const crawlerTemplateService = {
	getWorkflowTemplates: async (): Promise<CrawlerTemplateDto[]> => {
		const { data } = await managementBackendClient.get('workflow-templates');
		return data;
	},

	submitWorkflowTemplateRun: async (
		namespace: string,
		templateName: string,
		parameters?: { name: string; value: string }[],
	): Promise<void> => {
		await managementBackendClient.post(
			`workflow-templates/${namespace}/${templateName}/submit`,
			parameters,
		);
	},
};
