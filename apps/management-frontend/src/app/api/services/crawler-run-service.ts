import { CursorBasedPaginationResponseDto } from '@/src/app/api/dto/pagination/cursor-based-pagination-response.dto';
import { CrawlerRunDto } from '@/src/app/api/dto/workflow/crawler-run.dto';
import { managementBackendClient } from '../management-backend-client';

export const crawlerRunService = {
	getWorkflowRuns: async (
		scheduleName?: string,
	): Promise<CursorBasedPaginationResponseDto<CrawlerRunDto>> => {
		const path = `workflow-runs${scheduleName ? `?scheduleName=${encodeURIComponent(scheduleName)}` : ''}`;
		const { data } = await managementBackendClient.get(path);
		return data;
	},
};
