import { CrawlerRunDto } from '../crawler-runs/dto/crawler-run.dto';
import { CrawlerRunFilterDto } from '../crawler-runs/dto/crawler-run-filter.dto';
import { CrawlerRunParameterDto } from '../crawler-runs/dto/crawler-run-parameter.dto';
import { CrawlerTemplateDto } from '../crawler-templates/dto/crawler-template.dto';
import { CrawlerTemplatesFilterDto } from '../crawler-templates/dto/crawler-templates-filter.dto';
import { HealthStatusEnum } from '../health/enum/healthStatus.enum';
import { CursorBasedPaginationRequestDto } from '../pagination/dto/cursor-based-pagination-request.dto';
import { CursorBasedPaginationResponseDto } from '../pagination/dto/cursor-based-pagination-response.dto';
import { ScheduleDto } from '../schedules/dto/schedule.dto';
import { ArgoCronWorkflow } from '../schedules/infrastructure/argo/argo-cron-workflow';

export interface IOrchestratorClient {
	checkHealth(): Promise<HealthStatusEnum>;

	listCrawlerRuns(
		filterOptions?: CrawlerRunFilterDto,
		paginationOptions?: CursorBasedPaginationRequestDto,
	): Promise<CursorBasedPaginationResponseDto<CrawlerRunDto>>;

	getCrawlerRunByNameAndNamespace(name: string, namespace: string): Promise<CrawlerRunDto | null>;

	listCrawlerTemplates(filterOptions?: CrawlerTemplatesFilterDto): Promise<CrawlerTemplateDto[]>;

	getCrawlerTemplateByNameAndNamespace(
		name: string,
		namespace: string,
	): Promise<CrawlerTemplateDto | null>;

	submitCrawlerRunFromCrawlerTemplate(
		crawlerTemplateName: string,
		crawlerTemplateNamespace: string,
		parameters?: CrawlerRunParameterDto[],
	): Promise<CrawlerRunDto>;

	listSchedules(): Promise<ScheduleDto[]>;

	getScheduleByNameAndNamespace(name: string, namespace: string): Promise<ScheduleDto | null>;

	createSchedule(cronWorkflowObject: ArgoCronWorkflow, namespace: string): Promise<void>;

	deleteSchedule(name: string, namespace: string): Promise<void>;

	suspendSchedule(name: string, namespace: string): Promise<void>;

	resumeSchedule(name: string, namespace: string): Promise<void>;
}

export const ORCHESTRATOR_CLIENT = 'ORCHESTRATOR_CLIENT';
