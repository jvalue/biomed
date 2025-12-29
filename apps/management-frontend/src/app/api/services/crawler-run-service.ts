import { CrawlerRunDto } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { CursorBasedPaginationResponseDto } from '@/src/app/api/dto/pagination/cursor-based-pagination-response.dto';
import { managementBackendClient } from '../management-backend-client';

export const crawlerRunService = {
	getCrawlerRuns: async (
		scheduleName?: string,
	): Promise<CursorBasedPaginationResponseDto<CrawlerRunDto>> => {
		const path = `crawler-runs${scheduleName ? `?scheduleName=${encodeURIComponent(scheduleName)}` : ''}`;
		const { data } = await managementBackendClient.get(path);
		return data;
	},
};
