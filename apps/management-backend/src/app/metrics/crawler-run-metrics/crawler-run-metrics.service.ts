import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawlerRunEventIncomingDto } from './dto/incoming/crawler-run-event-incoming.dto';
import { CrawlerRunMetricsIncomingDto } from './dto/incoming/crawler-run-metrics-incoming.dto';
import { CrawlerRunEventOutgoingDto } from './dto/outgoing/crawler-run-event-outgoing.dto';
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
	 * @param metric The metrics to save.
	 */
	async saveCrawlerRunMetric(runId: string, metric: CrawlerRunMetricsIncomingDto): Promise<void> {
		this.logger.log(`Saving metrics for crawler run ${runId}`);
		try {
			await this.crawlerRunMetricsRepository.save({
				runId,
				scheduleName: metric.scheduleName,
				scheduleNamespace: metric.scheduleNamespace,
				crawledDataSets: metric.crawledDataSets,
				cacheHits: metric.cacheHits,
			});
		} catch (error) {
			// If error is because of schedule foreign key not existing, throw a bad request error
			if (error.code === '23503') {
				this.logger.error(
					`Failed to save metrics for crawler run ${runId}: Schedule with name ${metric.scheduleName} and namespace ${metric.scheduleNamespace} does not exist`,
				);
				throw new BadRequestException('Schedule does not exist');
			}
			this.logger.error(`Failed to save metrics for crawler run ${runId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get metrics by crawler run ID.
	 * @param runId The ID of the crawler run.
	 * @returns The metrics for the specified crawler run, or null if not found.
	 */
	async getMetricsByRunId(runId: string): Promise<CrawlerRunMetricEntity | null> {
		return this.crawlerRunMetricsRepository.findOne({ where: { runId } });
	}

	/**
	 * Saves a crawler run event
	 * @param runId The ID of the crawler run
	 * @param event The event to store for the crawler run
	 */
	async saveCrawlerRunEvent(runId: string, event: CrawlerRunEventIncomingDto) {
		this.logger.log(`Saving event for crawler run ${runId}`);
		// Ensure run already exists
		await this.createEmptyCrawlerRunMetricIfDoesntExist(runId);
		await this.crawlerRunEventEntityRepository.save({
			runId,
			type: event.type,
			timestamp: event.timestamp,
			message: event.message,
		});
	}

	/**
	 * Gets all events for a crawler run ordered by latest first
	 * @param runId The ID of the crawler run
	 * @returns The events for the specified crawler run
	 */
	async getCrawlerRunEvents(runId: string): Promise<CrawlerRunEventOutgoingDto[]> {
		const events = await this.crawlerRunEventEntityRepository.find({
			where: { runId },
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
	 * @private
	 */
	private async createEmptyCrawlerRunMetricIfDoesntExist(runId: string) {
		try {
			await this.crawlerRunMetricsRepository.insert({
				runId,
			});
		} catch (error) {
			// If error is because of duplicate primary key error -> ignore as then the entity already exists, which
			// is fine
			if (error.code !== '23505') {
				this.logger.error(
					`Failed to create empty crawler run metric for run ID ${runId}: ${error.message}`,
				);
				throw error;
			}
		}
	}
}
