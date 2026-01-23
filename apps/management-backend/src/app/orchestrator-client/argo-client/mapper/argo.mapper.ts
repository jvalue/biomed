/**
 * Mapper functions for argo
 */

import { CrawlerRunDto } from '../../../crawler-runs/dto/crawler-run.dto';
import { CrawlerTemplateDto } from '../../../crawler-templates/dto/crawler-template.dto';
import { CursorBasedPaginationResponseDto } from '../../../pagination/dto/cursor-based-pagination-response.dto';
import { ScheduleDto } from '../../../schedules/dto/schedule.dto';
import { ArgoCursorPaginatedListDto } from '../dto/argo-cursor-paginated-list-dto';
import { ArgoCronWorkflowDto } from '../dto/cron-workflows/argo-cron-workflow.dto';
import { ArgoWorkflowRunDto } from '../dto/workflow-runs/argo-workflow-run.dto';
import { ArgoWorkflowTemplateDto } from '../dto/workflow-templates/argo-workflow-template.dto';

/**
 * Maps ArgoWorkflowRunDto to CrawlerRunDto
 * @param run
 */
export function mapArgoWorkflowRunDtoToWorkflowRunDto(run: ArgoWorkflowRunDto): CrawlerRunDto {
	const workflowRun = new CrawlerRunDto();
	workflowRun.name = run.metadata.name;
	workflowRun.namespace = run.metadata.namespace;
	workflowRun.crawlerTemplateName =
		run.metadata.labels['workflows.argoproj.io/workflow-template'] ??
		run.metadata.labels.customSetWorkflowTemplateName;
	workflowRun.scheduleName = run.metadata.labels['workflows.argoproj.io/cron-workflow'];
	workflowRun.phase = run.status.phase;
	workflowRun.startedAt = run.status.startedAt;
	workflowRun.finishedAt = run.status.finishedAt;
	workflowRun.parameters = run.spec.arguments.parameters;
	return workflowRun;
}

/**
 * Maps ArgoWorkflowTemplateDto to CrawlerTemplateDto
 * @param template
 */
export function mapArgoWorkflowTemplateDtoToWorkflowTemplateDto(
	template: ArgoWorkflowTemplateDto,
): CrawlerTemplateDto {
	const crawlerTemplateDto = new CrawlerTemplateDto();
	crawlerTemplateDto.name = template.metadata.name;
	crawlerTemplateDto.namespace = template.metadata.namespace;
	crawlerTemplateDto.createdAt = template.metadata.creationTimestamp;
	crawlerTemplateDto.parameters = template.spec?.arguments?.parameters?.map((param) => ({
		name: param.name,
		defaultValue: param.value,
	}));
	crawlerTemplateDto.templateVersion = template.metadata.labels['template-version'];
	return crawlerTemplateDto;
}

/**
 * Maps ArgoCronWorkflowDto to ScheduleDto
 * @param cronWorkflow
 */
export function mapArgoCronWorkflowDtoToScheduleDto(
	cronWorkflow: ArgoCronWorkflowDto,
): ScheduleDto {
	const schedule = new ScheduleDto();
	schedule.name = cronWorkflow.metadata.name;
	schedule.namespace = cronWorkflow.metadata.namespace;
	// We filter for cron workflows that reference a workflow template, so this should always be defined
	schedule.crawlerTemplateName = cronWorkflow.spec.workflowSpec.workflowTemplateRef?.name ?? '';
	schedule.parameters =
		cronWorkflow.spec.workflowSpec.arguments?.parameters?.map((param) => ({
			name: param.name,
			value: param.value,
		})) ?? [];
	if (cronWorkflow.spec.workflowSpec.retryStrategy) {
		schedule.retryStrategy = {
			retries: cronWorkflow.spec.workflowSpec.retryStrategy.limit ?? 0,
			backoffDuration: cronWorkflow.spec.workflowSpec.retryStrategy.backoff?.duration ?? undefined,
			backoffFactor: cronWorkflow.spec.workflowSpec.retryStrategy.backoff?.factor ?? undefined,
			backoffCap: cronWorkflow.spec.workflowSpec.retryStrategy.backoff?.cap ?? undefined,
			backoffMaxDuration:
				cronWorkflow.spec.workflowSpec.retryStrategy.backoff?.maxDuration ?? undefined,
		};
	}
	schedule.schedule = cronWorkflow.spec.schedules ? cronWorkflow.spec.schedules[0] : '';
	schedule.suspended = cronWorkflow.spec.suspend;
	schedule.createdAt = cronWorkflow.metadata.creationTimestamp;
	schedule.statistics = {
		successfulRuns: cronWorkflow.status.succeeded,
		failedRuns: cronWorkflow.status.failed,
	};

	return schedule;
}

/**
 * Maps a generic ArgoCursorPaginatedListDto to CursorBasedPaginationResponseDto with pagination information
 * @param {ArgoCursorPaginatedListDto} listDto to be mapped to our internal generic pagination dto
 * @param mapItem function to map individual items from Input type to Output type
 * @returns {CursorBasedPaginationResponseDto<Output>} mapped pagination dto
 */
export function mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto<Input, Output>(
	listDto: ArgoCursorPaginatedListDto<Input>,
	mapItem: (item: Input) => Output,
): CursorBasedPaginationResponseDto<Output> {
	const data: Output[] = listDto.items?.map(mapItem) ?? [];

	return {
		metadata: { hasMore: listDto.metadata.continue > 0 },
		data,
	};
}
