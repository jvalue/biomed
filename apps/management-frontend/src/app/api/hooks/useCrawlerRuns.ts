import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { CrawlerRunDto, CrawlerRunPhaseEnum } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { CursorBasedPaginationResponseDto } from '@/src/app/api/dto/pagination/cursor-based-pagination-response.dto';
import { isRetryableError } from '@/src/app/api/hooks/hook-utils';
import { crawlerRunService } from '@/src/app/api/services/crawler-run.service';

export const useCrawlerRuns = (params?: {
	namespace?: string;
	scheduleName?: string;
	crawlerTemplateName?: string;
	phases?: CrawlerRunPhaseEnum[];
	startedAfter?: Date;
	finishedBefore?: Date;
	limit?: number;
	offset?: number;
}): UseQueryResult<CursorBasedPaginationResponseDto<CrawlerRunDto>> => {
	return useQuery({
		queryKey: [
			'crawlerRuns',
			{
				namespace: params?.namespace,
				scheduleName: params?.scheduleName,
				crawlerTemplateName: params?.crawlerTemplateName,

				// keep array order stable
				phases: params?.phases ? [...params.phases].sort() : undefined,

				// avoid Date objects in keys
				startedAfter: params?.startedAfter?.toISOString(),
				finishedBefore: params?.finishedBefore?.toISOString(),

				limit: params?.limit,
				offset: params?.offset,
			},
		],
		queryFn: () => crawlerRunService.getCrawlerRuns(params),
		refetchInterval: (query) => {
			if (query.state.error) {
				if (isRetryableError(query.state.error)) {
					return 60000; // Retry every minute on retryable errors
				} else {
					return false; // Do not retry on non-retryable errors
				}
			}
			return 5000;
		},
		// Handled by the refetchInterval logic
		retry: false,
	});
};
