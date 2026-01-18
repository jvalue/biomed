import { CrawlerRunPhaseEnum } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { CrawlerRunEventTypeEnum } from '@/src/app/api/dto/crawler-runs/metrics/crawler-run-event.dto';

// Utility to get CSS classes based on crawler run phase
export function getPhaseClass(phase?: CrawlerRunPhaseEnum | string) {
	switch (phase) {
		case CrawlerRunPhaseEnum.PENDING:
			return 'bg-yellow-100 text-yellow-800';
		case CrawlerRunPhaseEnum.RUNNING:
			return 'bg-blue-100 text-blue-800';
		case CrawlerRunPhaseEnum.SUCCEEDED:
			return 'bg-green-100 text-green-800';
		case CrawlerRunPhaseEnum.FAILED:
			return 'bg-red-100 text-red-800';
		case CrawlerRunPhaseEnum.ERROR:
			return 'bg-rose-100 text-rose-800';
		default:
			return '';
	}
}

// Utility to get CSS classes based on event type
export function getEventTypeClass(type: CrawlerRunEventTypeEnum) {
	switch (type) {
		case CrawlerRunEventTypeEnum.INFO:
			return 'bg-blue-100 text-blue-800';
		case CrawlerRunEventTypeEnum.WARNING:
			return 'bg-yellow-100 text-yellow-800';
		case CrawlerRunEventTypeEnum.ERROR:
			return 'bg-red-100 text-red-800';
		default:
			return '';
	}
}
