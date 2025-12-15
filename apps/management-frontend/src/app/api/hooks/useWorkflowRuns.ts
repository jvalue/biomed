import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { CursorBasedPaginationResponseDto } from '@/src/app/api/dto/pagination/cursor-based-pagination-response.dto';
import { WorkflowRunDto } from '@/src/app/api/dto/workflow/workflow-run.dto';
import { workflowService } from '../services/workflow-service';

export const useWorkflowRuns = (): UseQueryResult<
	CursorBasedPaginationResponseDto<WorkflowRunDto>
> => {
	return useQuery({
		queryKey: ['workflowRuns'],
		queryFn: workflowService.getWorkflowRuns,
		refetchInterval: 5000, // Auto-refresh
	});
};
