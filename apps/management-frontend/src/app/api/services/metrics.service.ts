import { CrawlerRunEventDto } from '@/src/app/api/dto/crawler-runs/metrics/crawler-run-event.dto';
import { CrawlerRunMetricDto } from '@/src/app/api/dto/crawler-runs/metrics/crawler-run-metric.dto';
import { managementBackendClient } from '../management-backend-client';

export const metricsService = {
	getCrawlerRunMetrics: async (runNamespace: string, runId: string) => {
		return managementBackendClient
			.get<CrawlerRunMetricDto>(`/crawler-runs/${runNamespace}/${runId}/metrics`)
			.then((response) => response.data);
	},

	getCrawlerRunEvents: async (runNamespace: string, runId: string) => {
		return managementBackendClient
			.get<CrawlerRunEventDto[]>(`/crawler-runs/${runNamespace}/${runId}/events`)
			.then((response) => response.data);
	},
};
