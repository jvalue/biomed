import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crawlerTemplateService } from '@/src/app/api/services/crawler-template-service';

export const useCrawlerTemplates = () => {
	return useQuery({
		queryKey: ['workflowTemplates'],
		queryFn: crawlerTemplateService.getWorkflowTemplates,
		refetchInterval: 10000, // Auto-refresh
	});
};

type SubmitWorkflowVariables = {
	// The namespace of the crawler template
	workflowTemplateNamespace: string;
	// The name of the crawler template (unique within the namespace)
	workflowTemplateName: string;
	parameters: { name: string; value: string }[];
};

export const useSubmitWorkflowTemplateRun = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (params: SubmitWorkflowVariables) =>
			crawlerTemplateService.submitWorkflowTemplateRun(
				params.workflowTemplateNamespace,
				params.workflowTemplateName,
				params.parameters,
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workflowRuns'] });
		},
	});
};
