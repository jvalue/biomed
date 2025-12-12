import { CurserBasedPaginationResponseDto } from '@/src/app/api/dto/pagination/curser-based-pagination-response.dto';
import { WorkflowRunDto } from '@/src/app/api/dto/workflow/workflow-run.dto';
import { managementBackendClient } from '../management-backend-client';

export const workflowService = {
	getWorkflowRuns: async (): Promise<CurserBasedPaginationResponseDto<WorkflowRunDto>> => {
		const { data } = await managementBackendClient.get('workflow-runs');
		return data;
	},
};
