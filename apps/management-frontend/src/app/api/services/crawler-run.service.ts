import { CrawlerRunDto, CrawlerRunPhaseEnum } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { CursorBasedPaginationResponseDto } from '@/src/app/api/dto/pagination/cursor-based-pagination-response.dto';
import { managementBackendClient } from '../management-backend-client';

export const crawlerRunService = {
	getCrawlerRuns: async (
		params: {
			namespace?: string;
			scheduleName?: string;
			crawlerTemplateName?: string;
			phases?: CrawlerRunPhaseEnum[];
			startedAfter?: Date;
			finishedBefore?: Date;
			limit?: number;
			offset?: number;
		} = {},
	): Promise<CursorBasedPaginationResponseDto<CrawlerRunDto>> => {
		const qs = new URLSearchParams();

		// string filters
		if (params.scheduleName) qs.set('scheduleName', params.scheduleName);
		if (params.namespace) qs.set('namespace', params.namespace);
		if (params.crawlerTemplateName) qs.set('crawlerTemplateName', params.crawlerTemplateName);

		// phases
		if (params.phases?.length) {
			for (const p of params.phases ?? []) {
				qs.append('phases', p);
			}
		}

		// date filters to ISO strings
		if (params.startedAfter) {
			qs.set('startedAfter', params.startedAfter.toISOString());
		}

		if (params.finishedBefore) {
			qs.set('finishedBefore', params.finishedBefore.toISOString());
		}

		// pagination
		if (params.limit !== undefined) qs.set('limit', String(params.limit));
		if (params.offset !== undefined) qs.set('offset', String(params.offset));

		const path = `crawler-runs${qs.toString() ? `?${qs.toString()}` : ''}`;
		const { data } = await managementBackendClient.get(path);
		return data;
	},

	getCrawlerRun: async (runNamespace: string, runName: string): Promise<CrawlerRunDto> => {
		const { data } = await managementBackendClient.get(`crawler-runs/${runNamespace}/${runName}`);
		return data;
	},
};
