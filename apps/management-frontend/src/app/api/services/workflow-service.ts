import { CursorBasedPaginationResponseDto } from '@/src/app/api/dto/pagination/cursor-based-pagination-response.dto';
import { WorkflowRunDto } from '@/src/app/api/dto/workflow/workflow-run.dto';
import { managementBackendClient } from '../management-backend-client';

export const workflowService = {
	getWorkflowRuns: async (): Promise<CursorBasedPaginationResponseDto<WorkflowRunDto>> => {
		const { data } = await managementBackendClient.get('workflow-runs');
		return data;
	},
};
