import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crawlerTemplateService } from '@/src/app/api/services/crawler-template-service';

export const useCrawlerTemplates = () => {
	return useQuery({
		queryKey: ['crawlerTemplates'],
		queryFn: crawlerTemplateService.getCrawlerTemplates,
		refetchInterval: 10000, // Auto-refresh
	});
};

type SubmitCrawlerRunVariables = {
	// The namespace of the crawler template
	crawlerTemplateNamespace: string;
	// The name of the crawler template (unique within the namespace)
	crawlerTemplateName: string;
	parameters: { name: string; value: string }[];
};

export const useSubmitCrawlerTemplateRun = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (params: SubmitCrawlerRunVariables) =>
			crawlerTemplateService.submitCrawlerTemplateRun(
				params.crawlerTemplateNamespace,
				params.crawlerTemplateName,
				params.parameters,
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['crawlerRuns'] });
		},
	});
};
