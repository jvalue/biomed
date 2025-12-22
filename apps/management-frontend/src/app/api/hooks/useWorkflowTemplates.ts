import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workflowTemplateService } from '@/src/app/api/services/workflow-template-service';

export const useWorkflowTemplates = () => {
	return useQuery({
		queryKey: ['workflowTemplates'],
		queryFn: workflowTemplateService.getWorkflowTemplates,
		refetchInterval: 10000, // Auto-refresh
	});
};

type SubmitWorkflowVariables = {
	// The namespace of the workflow template
	workflowTemplateNamespace: string;
	// The name of the workflow template (unique within the namespace)
	workflowTemplateName: string;
	parameters: { name: string; value: string }[];
};

export const useSubmitWorkflowTemplateRun = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (params: SubmitWorkflowVariables) =>
			workflowTemplateService.submitWorkflowTemplateRun(
				params.workflowTemplateNamespace,
				params.workflowTemplateName,
				params.parameters,
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workflowRuns'] });
		},
	});
};
