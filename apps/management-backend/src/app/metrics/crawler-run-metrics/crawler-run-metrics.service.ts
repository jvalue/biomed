import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawlerRunEventIncomingDto } from './dto/incoming/crawler-run-event-incoming.dto';
import { CrawlerRunMetricsIncomingDto } from './dto/incoming/crawler-run-metrics-incoming.dto';
import { CrawlerRunEventOutgoingDto } from './dto/outgoing/crawler-run-event-outgoing.dto';
import { CrawlerRunMetricsOutgoingDto } from './dto/outgoing/crawler-run-metrics-outgoing.dto';
import { CrawlerRunEventEntity } from './entity/crawler-run-event.entity';
import { CrawlerRunMetricEntity } from './entity/crawler-run-metric.entity';

@Injectable()
export class CrawlerRunMetricsService {
	private readonly logger = new Logger(CrawlerRunMetricsService.name);

	constructor(
		@InjectRepository(CrawlerRunMetricEntity)
		private readonly crawlerRunMetricsRepository: Repository<CrawlerRunMetricEntity>,
		@InjectRepository(CrawlerRunEventEntity)
		private readonly crawlerRunEventEntityRepository: Repository<CrawlerRunEventEntity>,
	) {}

	/**
	 * Save crawler run metric.
	 * @param runId The ID of the crawler run.
	 * @param runNamespace The namespace of the crawler run.
	 * @param metric The metrics to save.
	 */
	async saveCrawlerRunMetric(
		runId: string,
		runNamespace: string,
		metric: CrawlerRunMetricsIncomingDto,
	): Promise<void> {
		this.logger.log(`Saving metrics for crawler run ${runId} in namespace ${runNamespace}`);
		try {
			await this.crawlerRunMetricsRepository.save({
				runId,
				runNamespace,
				scheduleName: metric.scheduleName,
				scheduleNamespace: metric.scheduleNamespace,
				progress: metric.progress,
				crawledDataSets: metric.crawledDataSets,
				cacheHits: metric.cacheHits,
			});
		} catch (error) {
			this.logger.error(
				`Failed to save metrics for crawler run ${runId} in namespace ${runNamespace}: ${error.message}`,
			);
			throw error;
		}
	}

	/**
	 * Get metrics by crawler run ID.
	 * @param runId The ID of the crawler run.
	 * @param runNamespace The namespace of the crawler run.
	 * @returns The metrics for the specified crawler run, or null if not found.
	 */
	async getMetricsByRunId(
		runId: string,
		runNamespace: string,
	): Promise<CrawlerRunMetricsOutgoingDto | null> {
		return this.crawlerRunMetricsRepository.findOne({ where: { runId, runNamespace } });
	}

	/**
	 * Saves a crawler run event
	 * @param runId The ID of the crawler run
	 * @param runNamespace The namespace of the crawler run
	 * @param event The event to store for the crawler run
	 */
	async saveCrawlerRunEvent(
		runId: string,
		runNamespace: string,
		event: CrawlerRunEventIncomingDto,
	) {
		this.logger.log(`Saving event for crawler run ${runId} in namespace ${runNamespace}`);
		// Ensure run already exists
		await this.createEmptyCrawlerRunMetricIfDoesntExist(runId, runNamespace);
		await this.crawlerRunEventEntityRepository.save({
			runId,
			runNamespace,
			type: event.type,
			timestamp: event.timestamp,
			message: event.message,
		});
	}

	/**
	 * Gets all events for a crawler run ordered by latest first
	 * @param runId The ID of the crawler run
	 * @param runNamespace The namespace of the crawler run
	 * @returns The events for the specified crawler run
	 */
	async getCrawlerRunEvents(
		runId: string,
		runNamespace: string,
	): Promise<CrawlerRunEventOutgoingDto[]> {
		const events = await this.crawlerRunEventEntityRepository.find({
			where: { runId, runNamespace },
			order: { timestamp: 'DESC' },
		});
		// Map to outgoing DTO
		return events.map((event) => ({
			type: event.type,
			message: event.message,
			timestamp: event.timestamp,
		}));
	}

	/**
	 * Creates an empty crawler run metric if it doesn't already exist
	 * @param runId
	 * @param runNamespace
	 * @private
	 */
	private async createEmptyCrawlerRunMetricIfDoesntExist(runId: string, runNamespace: string) {
		if (await this.crawlerRunMetricsRepository.findOneBy({ runId, runNamespace })) {
			return;
		}
		await this.crawlerRunMetricsRepository.upsert(
			{
				runId,
				runNamespace,
			},
			['runId', 'runNamespace'],
		);
	}
}
