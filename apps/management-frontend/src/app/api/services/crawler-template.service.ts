import { CrawlerTemplateDto } from '@/src/app/api/dto/crawler-templates/crawler-template.dto';
import { managementBackendClient } from '../management-backend-client';

export const crawlerTemplateService = {
	getCrawlerTemplates: async (): Promise<CrawlerTemplateDto[]> => {
		const { data } = await managementBackendClient.get('crawler-templates');
		return data;
	},

	getCrawlerTemplateByNameAndNamespace: async (
		name: string,
		namespace: string,
	): Promise<CrawlerTemplateDto> => {
		const path = `crawler-templates/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
		const { data } = await managementBackendClient.get(path);
		return data;
	},

	submitCrawlerTemplateRun: async (
		namespace: string,
		templateName: string,
		parameters?: { name: string; value: string }[],
	): Promise<void> => {
		await managementBackendClient.post(
			`crawler-templates/${namespace}/${templateName}/submit`,
			parameters,
		);
	},
};
