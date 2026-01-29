import { CrawlerRunDto } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { CursorBasedPaginationResponseDto } from '@/src/app/api/dto/pagination/cursor-based-pagination-response.dto';
import { managementBackendClient } from '../management-backend-client';

export const crawlerRunService = {
	getCrawlerRuns: async (
		params: {
			scheduleName?: string;
			namespace?: string;
			crawlerTemplateName?: string;
			phases?: string[];
			startedAfter?: string | Date;
			finishedBefore?: string | Date;
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
			for (const p of params.phases) {
				qs.append('phases', p);
			}
		}

		// date filters to ISO strings
		if (params.startedAfter) {
			const iso =
				params.startedAfter instanceof Date
					? params.startedAfter.toISOString()
					: params.startedAfter;
			qs.set('startedAfter', iso);
		}

		if (params.finishedBefore) {
			const iso =
				params.finishedBefore instanceof Date
					? params.finishedBefore.toISOString()
					: params.finishedBefore;
			qs.set('finishedBefore', iso);
		}

		// pagination
		if (typeof params.limit === 'number') qs.set('limit', String(params.limit));
		if (typeof params.offset === 'number') qs.set('offset', String(params.offset));

		const path = `crawler-runs${qs.toString() ? `?${qs.toString()}` : ''}`;
		const { data } = await managementBackendClient.get(path);
		return data;
	},

	getCrawlerRun: async (runId: string, runNamespace: string): Promise<CrawlerRunDto> => {
		const { data } = await managementBackendClient.get(`crawler-runs/${runNamespace}/${runId}`);
		return data;
	},
};
