import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawlerRunMetricsIncomingDto } from './dto/incoming/crawler-run-metrics-incoming.dto';
import { CrawlerRunMetricEntity } from './entity/crawler-run-metric.entity';

@Injectable()
export class CrawlerRunMetricsService {
	private readonly logger = new Logger(CrawlerRunMetricsService.name);

	constructor(
		@InjectRepository(CrawlerRunMetricEntity)
		private readonly crawlerRunMetricsRepository: Repository<CrawlerRunMetricEntity>,
	) {}

	/**
	 * Save crawler run metrics.
	 * @param runId The ID of the crawler run.
	 * @param metric The metrics to save.
	 */
	async saveCrawlerRunMetrics(runId: string, metric: CrawlerRunMetricsIncomingDto): Promise<void> {
		this.logger.log(`Saving metrics for crawler run ${runId}`);
		try {
			const crawlerRunMetric = this.crawlerRunMetricsRepository.create({
				runId,
				scheduleName: metric.scheduleName,
				scheduleNamespace: metric.scheduleNamespace,
				crawledDataSets: metric.crawledDataSets,
				cacheHits: metric.cacheHits,
			});
			await this.crawlerRunMetricsRepository.save(crawlerRunMetric);
			this.logger.log(`Metrics for crawler run ${runId} saved successfully`);
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
}
