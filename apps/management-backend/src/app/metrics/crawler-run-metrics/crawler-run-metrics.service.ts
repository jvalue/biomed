import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistoricalMetricsQueryDto } from '../../schedules/dto/historical-metrics-query.dto';
import { ScheduleHistoricalMetricsItemDto } from '../../schedules/dto/schedule-historical-metrics-item.dto';
import { ScheduleOverallMetricsDto } from '../../schedules/dto/schedule-overall-metrics.dto';
import { CrawlerRunDownloadMetricsIncomingDto } from './dto/incoming/crawler-run-download-metrics-incoming.dto';
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
				runStartedAt: new Date(metric.runStartedAt),
			});
		} catch (error) {
			this.logger.error(
				`Failed to save metrics for crawler run ${runId} in namespace ${runNamespace}: ${error.message}`,
			);
			throw error;
		}
	}

	/**
	 * Save crawler run download metric.
	 * @param runId The ID of the crawler run.
	 * @param runNamespace The namespace of the crawler run.
	 * @param metric The download metrics to save.
	 */
	async saveCrawlerRunDownloadMetric(
		runId: string,
		runNamespace: string,
		metric: CrawlerRunDownloadMetricsIncomingDto,
	): Promise<void> {
		this.logger.log(
			`Saving download metrics for crawler run ${runId} in namespace ${runNamespace}`,
		);
		try {
			await this.crawlerRunMetricsRepository.save({
				runId,
				runNamespace,
				scheduleName: metric.scheduleName,
				scheduleNamespace: metric.scheduleNamespace,
				totalDatasetsToDownload: metric.totalDatasetsToDownload,
				downloadedDatasets: metric.downloadedDatasets,
				totalGBToDownload: metric.totalGBToDownload,
				downloadedGB: metric.downloadedGB,
				runStartedAt: new Date(metric.runStartedAt),
			});
		} catch (error) {
			this.logger.error(
				`Failed to save download metrics for crawler run ${runId} in namespace ${runNamespace}: ${error.message}`,
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
	 * Gets historical graph data for a schedule.
	 * Aggregates metrics by day.
	 * @param scheduleName The name of the schedule.
	 * @param scheduleNamespace The namespace of the schedule.
	 * @param queryDto The query parameters for date range.
	 * @returns The historical metrics for the schedule.
	 */
	async getHistoricalScheduleMetrics(
		scheduleName: string,
		scheduleNamespace: string,
		queryDto: HistoricalMetricsQueryDto,
	): Promise<ScheduleHistoricalMetricsItemDto[]> {
		const { from, to } = queryDto;
		const endDate = to ? new Date(to) : new Date();
		// Default to one year ago if no from date provided
		const startDate = from
			? new Date(from)
			: new Date(new Date().setFullYear(endDate.getFullYear() - 1));

		const qb = this.crawlerRunMetricsRepository
			.createQueryBuilder('m')
			// Select date as 'YYYY-MM-DD', sum of crawledDataSets and sum of cacheHits
			.select("TO_CHAR(m.runStartedAt, 'YYYY-MM-DD')", 'date')
			.addSelect('SUM(COALESCE(m.crawledDataSets, 0))', 'totalCrawled')
			.addSelect('SUM(COALESCE(m.cacheHits, 0))', 'totalCacheHits')

			// Filter by schedule
			.where('m.schedule_name = :name', { name: scheduleName })
			.andWhere('m.schedule_namespace = :namespace', { namespace: scheduleNamespace })

			// Filter by date range
			.andWhere('m.runStartedAt >= :startDate', { startDate })
			.andWhere('m.runStartedAt <= :endDate', { endDate })

			// Group by day
			.groupBy("TO_CHAR(m.runStartedAt, 'YYYY-MM-DD')")

			// Order by date ascending
			.orderBy('date', 'ASC');

		const rawResults = await qb.getRawMany();

		return rawResults.map((row) => {
			const date = (row.date as string) ?? '';
			const crawled = Number(row.totalCrawled ?? row.totalcrawled ?? 0);
			const cacheHits = Number(row.totalCacheHits ?? row.totalcachehits ?? 0);
			const newDatasets = Math.max(0, crawled - cacheHits);
			const percentage = crawled > 0 ? newDatasets / crawled : 0;

			return {
				date,
				crawledDataSets: crawled,
				newDatasets,
				newDatasetsPercentage: Number(percentage.toFixed(4)),
			};
		});
	}

	/**
	 * Get overall aggregated metrics for a schedule across all time.
	 * @param scheduleName The name of the schedule.
	 * @param scheduleNamespace The namespace of the schedule.
	 * @returns The overall metrics for the schedule.
	 */
	async getOverallScheduleMetrics(
		scheduleName: string,
		scheduleNamespace: string,
	): Promise<ScheduleOverallMetricsDto> {
		const qb = this.crawlerRunMetricsRepository
			.createQueryBuilder('m')
			.select('SUM(COALESCE(m.crawledDataSets, 0))', 'totalCrawled')
			.addSelect('SUM(COALESCE(m.cacheHits, 0))', 'totalCacheHits')
			.where('m.schedule_name = :name', { name: scheduleName })
			.andWhere('m.schedule_namespace = :namespace', { namespace: scheduleNamespace });

		const raw = await qb.getRawOne();
		const totalCrawled = Number(raw?.totalcrawled || raw?.totalCrawled || 0);
		const totalCacheHits = Number(raw?.totalcachehits || raw?.totalCacheHits || 0);
		const totalNew = Math.max(0, totalCrawled - totalCacheHits);
		const percentage = totalCrawled > 0 ? totalNew / totalCrawled : 0;

		return {
			totalCrawledDataSets: totalCrawled,
			totalNewDataSets: totalNew,
			totalNewDataSetsPercentage: Number(percentage.toFixed(4)),
		};
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
