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

	getCrawlerRunByNamespaceAndName(namespace: string, name: string): Promise<CrawlerRunDto | null>;

	listCrawlerTemplates(filterOptions?: CrawlerTemplatesFilterDto): Promise<CrawlerTemplateDto[]>;

	getCrawlerTemplateByNamespaceAndName(
		namespace: string,
		name: string,
	): Promise<CrawlerTemplateDto | null>;

	submitCrawlerRunFromCrawlerTemplate(
		crawlerTemplateNamespace: string,
		crawlerTemplateName: string,
		parameters?: CrawlerRunParameterDto[],
	): Promise<CrawlerRunDto>;

	listSchedules(): Promise<ScheduleDto[]>;

	getScheduleByNamespaceAndName(namespace: string, name: string): Promise<ScheduleDto | null>;

	createSchedule(cronWorkflowObject: ArgoCronWorkflow, namespace: string): Promise<void>;

	deleteSchedule(namespace: string, name: string): Promise<void>;

	suspendSchedule(namespace: string, name: string): Promise<void>;

	resumeSchedule(namespace: string, name: string): Promise<void>;
}

export const ORCHESTRATOR_CLIENT = 'ORCHESTRATOR_CLIENT';
