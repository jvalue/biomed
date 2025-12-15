/**
 * Mapper functions for argo
 */

import { CursorBasedPaginationResponseDto } from '../../pagination/dto/cursor-based-pagination-response.dto';
import { WorkflowRunDto } from '../../workflow-runs/dto/workflow-run.dto';
import { ArgoCursorPaginatedListDto } from '../dto/argo-cursor-paginated-list-dto';
import { ArgoWorkflowRunDto } from '../dto/workflow-runs/argo-workflow-run.dto';

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
