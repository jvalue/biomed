import { Injectable } from '@nestjs/common';
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
	constructor(
		@InjectRepository(CrawlerRunMetricEntity)
		private readonly crawlerRunMetricsRepository: Repository<CrawlerRunMetricEntity>,
		@InjectRepository(CrawlerRunEventEntity)
		private readonly crawlerRunEventEntityRepository: Repository<CrawlerRunEventEntity>,
	) {}

	/**
	 * Save crawler run metric.
	 * @param runNamespace The namespace of the crawler run.
	 * @param runName The name of the crawler run.
	 * @param metric The metrics to save.
	 */
	async saveCrawlerRunMetric(
		runNamespace: string,
		runName: string,
		metric: CrawlerRunMetricsIncomingDto,
	): Promise<void> {
		await this.crawlerRunMetricsRepository.save({
			runName,
			runNamespace,
			scheduleName: metric.scheduleName,
			scheduleNamespace: metric.scheduleNamespace,
			progress: metric.progress,
			crawledDataSets: metric.crawledDataSets,
			cacheHits: metric.cacheHits,
			runStartedAt: new Date(metric.runStartedAt),
		});
	}

	/**
	 * Save crawler run download metric.
	 * @param runNamespace The namespace of the crawler run.
	 * @param runName The name of the crawler run.
	 * @param metric The download metrics to save.
	 */
	async saveCrawlerRunDownloadMetric(
		runNamespace: string,
		runName: string,
		metric: CrawlerRunDownloadMetricsIncomingDto,
	): Promise<void> {
		await this.crawlerRunMetricsRepository.save({
			runName,
			runNamespace,
			scheduleName: metric.scheduleName,
			scheduleNamespace: metric.scheduleNamespace,
			totalDatasetsToDownload: metric.totalDatasetsToDownload,
			downloadedDatasets: metric.downloadedDatasets,
			totalGBToDownload: metric.totalGBToDownload,
			downloadedGB: metric.downloadedGB,
			runStartedAt: new Date(metric.runStartedAt),
		});
	}

	/**
	 * Get metrics by crawler run name.
	 * @param runNamespace The namespace of the crawler run.
	 * @param runName The name of the crawler run.
	 * @returns The metrics for the specified crawler run, or null if not found.
	 */
	async getMetricsByRunName(
		runNamespace: string,
		runName: string,
	): Promise<CrawlerRunMetricsOutgoingDto | null> {
		return this.crawlerRunMetricsRepository.findOne({ where: { runName, runNamespace } });
	}

	/**
	 * Saves a crawler run event
	 * @param runNamespace The namespace of the crawler run
	 * @param runName The name of the crawler run
	 * @param event The event to store for the crawler run
	 */
	async saveCrawlerRunEvent(
		runNamespace: string,
		runName: string,
		event: CrawlerRunEventIncomingDto,
	) {
		// Ensure run already exists
		await this.createEmptyCrawlerRunMetricIfDoesntExist(runNamespace, runName);
		await this.crawlerRunEventEntityRepository.save({
			runName,
			runNamespace,
			type: event.type,
			timestamp: event.timestamp,
			message: event.message,
		});
	}

	/**
	 * Gets all events for a crawler run ordered by latest first
	 * @param runNamespace The namespace of the crawler run
	 * @param runName The name of the crawler run
	 * @returns The events for the specified crawler run
	 */
	async getCrawlerRunEvents(
		runNamespace: string,
		runName: string,
	): Promise<CrawlerRunEventOutgoingDto[]> {
		const events = await this.crawlerRunEventEntityRepository.find({
			where: { runName, runNamespace },
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
	 * @param scheduleNamespace The namespace of the schedule.
	 * @param scheduleName The name of the schedule.
	 * @param queryDto The query parameters for date range.
	 * @returns The historical metrics for the schedule.
	 */
	async getHistoricalScheduleMetrics(
		scheduleNamespace: string,
		scheduleName: string,
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
	 * @param scheduleNamespace The namespace of the schedule.
	 * @param scheduleName The name of the schedule.
	 * @returns The overall metrics for the schedule.
	 */
	async getOverallScheduleMetrics(
		scheduleNamespace: string,
		scheduleName: string,
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
	 * @param runNamespace
	 * @param runName
	 * @private
	 */
	private async createEmptyCrawlerRunMetricIfDoesntExist(runNamespace: string, runName: string) {
		if (await this.crawlerRunMetricsRepository.findOneBy({ runName: runName, runNamespace })) {
			return;
		}
		await this.crawlerRunMetricsRepository.upsert(
			{
				runName: runName,
				runNamespace,
			},
			['runName', 'runNamespace'],
		);
	}
}
