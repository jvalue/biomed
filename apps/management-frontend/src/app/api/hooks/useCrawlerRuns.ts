import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { CrawlerRunDto } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { CursorBasedPaginationResponseDto } from '@/src/app/api/dto/pagination/cursor-based-pagination-response.dto';
import { crawlerRunService } from '@/src/app/api/services/crawler-run.service';

export const useCrawlerRuns = (params?: {
	scheduleName?: string;
	namespace?: string;
	crawlerTemplateName?: string;
	phases?: string[];
	startedAfter?: string | Date;
	finishedBefore?: string | Date;
	limit?: number;
	offset?: number;
}): UseQueryResult<CursorBasedPaginationResponseDto<CrawlerRunDto>> => {
	return useQuery({
		queryKey: [
			'crawlerRuns',
			params?.scheduleName,
			params?.namespace,
			params?.crawlerTemplateName,
			params?.phases,
			params?.startedAfter,
			params?.finishedBefore,
			params?.limit,
			params?.offset,
		],
		queryFn: () => crawlerRunService.getCrawlerRuns(params),
		refetchInterval: 5000, // Auto-refresh
	});
};
