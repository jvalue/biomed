import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { CrawlerRunDto } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { CursorBasedPaginationResponseDto } from '@/src/app/api/dto/pagination/cursor-based-pagination-response.dto';
import { isRetryableError } from '@/src/app/api/hooks/hook-utils';
import { crawlerRunService } from '@/src/app/api/services/crawler-run.service';

export const useCrawlerRuns = (params?: {
	scheduleName?: string;
	limit?: number;
	offset?: number;
}): UseQueryResult<CursorBasedPaginationResponseDto<CrawlerRunDto>> => {
	return useQuery({
		queryKey: ['crawlerRuns', params?.scheduleName, params?.limit, params?.offset],
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
