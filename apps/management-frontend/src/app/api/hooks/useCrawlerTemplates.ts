import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isRetryableError } from '@/src/app/api/hooks/hook-utils';
import { crawlerTemplateService } from '@/src/app/api/services/crawler-template.service';

export const useCrawlerTemplates = (options?: { enabled?: boolean }) => {
	const enabled = options?.enabled ?? true;
	return useQuery({
		queryKey: ['crawlerTemplates', 'list'],
		queryFn: crawlerTemplateService.getCrawlerTemplates,
		enabled,
		refetchInterval: (query) => {
			if (query.state.error) {
				if (isRetryableError(query.state.error)) {
					return 60000; // Retry every minute on retryable errors
				} else {
					return false; // Do not retry on non-retryable errors
				}
			}
			return 30000;
		},
		// Handled by the refetchInterval logic
		retry: false,
	});
};

export const useCrawlerTemplateByNameAndNamespace = (
	name: string,
	namespace: string,
	enabled: boolean = true,
) => {
	return useQuery({
		queryKey: ['crawlerTemplates', namespace, name],
		queryFn: () => crawlerTemplateService.getCrawlerTemplateByNameAndNamespace(name, namespace),
		refetchInterval: (query) => {
			if (query.state.error) {
				if (isRetryableError(query.state.error)) {
					return 60000; // Retry every minute on retryable errors
				} else {
					return false; // Do not retry on non-retryable errors
				}
			}
			return 30000;
		},
		enabled,
		// Handled by the refetchInterval logic
		retry: false,
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
			queryClient.invalidateQueries({ queryKey: ['crawlerRuns', 'list'] });
		},
	});
};
