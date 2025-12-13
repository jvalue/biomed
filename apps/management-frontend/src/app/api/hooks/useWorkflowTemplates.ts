import { useQuery } from '@tanstack/react-query';
import { workflowTemplateService } from '@/src/app/api/services/workflow-template-service';

export const useWorkflowTemplates = () => {
	return useQuery({
		queryKey: ['workflowTemplates'],
		queryFn: workflowTemplateService.getWorkflowTemplates,
		refetchInterval: 10000, // Auto-refresh
	});
};
