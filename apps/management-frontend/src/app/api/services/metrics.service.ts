import { CrawlerRunEventDto } from '@/src/app/api/dto/crawler-runs/metrics/crawler-run-event.dto';
import { CrawlerRunMetricDto } from '@/src/app/api/dto/crawler-runs/metrics/crawler-run-metric.dto';
import { managementBackendClient } from '../management-backend-client';

export const metricsService = {
	getCrawlerRunMetrics: async (runId: string, runNamespace: string) => {
		return managementBackendClient
			.get<CrawlerRunMetricDto>(`/metrics/crawler-run/${runNamespace}/${runId}`)
			.then((response) => response.data);
	},

	getCrawlerRunEvents: async (runId: string, runNamespace: string) => {
		return managementBackendClient
			.get<CrawlerRunEventDto[]>(`/metrics/crawler-run/${runNamespace}/${runId}/events`)
			.then((response) => response.data);
	},
};
