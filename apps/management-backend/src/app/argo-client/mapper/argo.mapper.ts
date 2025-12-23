/**
 * Mapper functions for argo
 */

import { CursorBasedPaginationResponseDto } from '../../pagination/dto/cursor-based-pagination-response.dto';
import { ScheduleDto } from '../../schedules/dto/schedule.dto';
import { WorkflowRunDto } from '../../workflow-runs/dto/workflow-run.dto';
import { WorkflowTemplateDto } from '../../workflow-templates/dto/workflow-template.dto';
import { ArgoCursorPaginatedListDto } from '../dto/argo-cursor-paginated-list-dto';
import { ArgoCronWorkflowDto } from '../dto/cron-workflows/argo-cron-workflow.dto';
import { ArgoWorkflowRunDto } from '../dto/workflow-runs/argo-workflow-run.dto';
import { ArgoWorkflowTemplateDto } from '../dto/workflow-templates/argo-workflow-template.dto';

/**
 * Maps ArgoWorkflowRunDto to WorkflowRunDto
 * @param run
 */
export function mapArgoWorkflowRunDtoToWorkflowRunDto(run: ArgoWorkflowRunDto): WorkflowRunDto {
	const workflowRun = new WorkflowRunDto();
	workflowRun.name = run.metadata.name;
	workflowRun.namespace = run.metadata.namespace;
	workflowRun.workflowTemplateName = run.metadata.labels['workflows.argoproj.io/workflow-template'];
	workflowRun.phase = run.status.phase;
	workflowRun.startedAt = run.status.startedAt;
	workflowRun.finishedAt = run.status.finishedAt;
	return workflowRun;
}

/**
 * Maps ArgoWorkflowTemplateDto to WorkflowTemplateDto
 * @param template
 */
export function mapArgoWorkflowTemplateDtoToWorkflowTemplateDto(
	template: ArgoWorkflowTemplateDto,
): WorkflowTemplateDto {
	const workflowTemplate = new WorkflowTemplateDto();
	workflowTemplate.name = template.metadata.name;
	workflowTemplate.namespace = template.metadata.namespace;
	workflowTemplate.createdAt = template.metadata.creationTimestamp;
	workflowTemplate.parameters = template.spec?.arguments?.parameters?.map((param) => ({
		name: param.name,
		defaultValue: param.value,
	}));
	workflowTemplate.templateVersion = template.metadata.labels['template-version'];
	return workflowTemplate;
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
	schedule.workflowTemplateName = cronWorkflow.spec.workflowSpec.workflowTemplateRef?.name ?? '';
	schedule.parameters =
		cronWorkflow.spec.workflowSpec.arguments?.parameters?.map((param) => ({
			name: param.name,
			value: param.value,
		})) ?? [];
	schedule.schedule = cronWorkflow.spec.schedule;
	schedule.suspended = cronWorkflow.spec.suspend;
	schedule.createdAt = cronWorkflow.metadata.creationTimestamp;

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
