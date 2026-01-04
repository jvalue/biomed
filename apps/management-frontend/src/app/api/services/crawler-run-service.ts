import { CrawlerRunDto } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { CursorBasedPaginationResponseDto } from '@/src/app/api/dto/pagination/cursor-based-pagination-response.dto';
import { managementBackendClient } from '../management-backend-client';

export const crawlerRunService = {
	getCrawlerRuns: async (params?: {
		scheduleName?: string;
		limit?: number;
		offset?: number;
	}): Promise<CursorBasedPaginationResponseDto<CrawlerRunDto>> => {
		const qs = new URLSearchParams();

		if (params?.scheduleName) qs.set('scheduleName', params.scheduleName);
		if (typeof params?.limit === 'number') qs.set('limit', String(params.limit));
		if (typeof params?.offset === 'number') qs.set('offset', String(params.offset));

		const path = `crawler-runs${qs.toString() ? `?${qs.toString()}` : ''}`;
		const { data } = await managementBackendClient.get(path);
		return data;
	},
};
