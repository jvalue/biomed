import { useQuery } from '@tanstack/react-query';
import { workflowService } from '../services/workflow-service';

export const useWorkflowRuns = () => {
	return useQuery({
		queryKey: ['workflowRuns'],
		queryFn: workflowService.getWorkflowRuns,
		refetchInterval: 5000, // Auto-refresh
	});
};
