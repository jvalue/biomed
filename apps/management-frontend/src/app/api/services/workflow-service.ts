import { CursorBasedPaginationResponseDto } from '@/src/app/api/dto/pagination/cursor-based-pagination-response.dto';
import { WorkflowRunDto } from '@/src/app/api/dto/workflow/workflow-run.dto';
import { managementBackendClient } from '../management-backend-client';

export const workflowService = {
	getWorkflowRuns: async (
		scheduleName?: string,
	): Promise<CursorBasedPaginationResponseDto<WorkflowRunDto>> => {
		const path = `workflow-runs${scheduleName ? `?scheduleName=${encodeURIComponent(scheduleName)}` : ''}`;
		const { data } = await managementBackendClient.get(path);
		return data;
	},
};
