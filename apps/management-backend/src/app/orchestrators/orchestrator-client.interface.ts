import { CrawlerRunDto } from '../crawler-runs/dto/crawler-run.dto';
import { CrawlerRunFilterDto } from '../crawler-runs/dto/crawler-run-filter.dto';
import { CrawlerRunParameterDto } from '../crawler-runs/dto/crawler-run-parameter.dto';
import { CrawlerTemplateDto } from '../crawler-templates/dto/crawler-template.dto';
import { CrawlerTemplatesFilterDto } from '../crawler-templates/dto/crawler-templates-filter.dto';
import { CursorBasedPaginationRequestDto } from '../pagination/dto/cursor-based-pagination-request.dto';
import { CursorBasedPaginationResponseDto } from '../pagination/dto/cursor-based-pagination-response.dto';
import { ScheduleDto } from '../schedules/dto/schedule.dto';

export interface IOrchestratorClient {
	listCrawlerRuns(
		filterOptions?: CrawlerRunFilterDto,
		paginationOptions?: CursorBasedPaginationRequestDto,
	): Promise<CursorBasedPaginationResponseDto<CrawlerRunDto>>;

	listCrawlerTemplates(filterOptions?: CrawlerTemplatesFilterDto): Promise<CrawlerTemplateDto[]>;

	submitCrawlerRunFromCrawlerTemplate(
		crawlerTemplateName: string,
		crawlerTemplateNamespace: string,
		parameters?: CrawlerRunParameterDto[],
	): Promise<CrawlerRunDto>;

	listSchedules(): Promise<ScheduleDto[]>;

	getScheduleByNameAndNamespace(name: string, namespace: string): Promise<ScheduleDto | null>;
}

export const ORCHESTRATOR_CLIENT = 'ORCHESTRATOR_CLIENT';
