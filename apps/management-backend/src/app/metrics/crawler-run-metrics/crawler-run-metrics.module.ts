import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbilityFactory } from '../../auth/ability-factory';
import { CrawlerRunMetricsController } from './crawler-run-metrics.controller';
import { CrawlerRunMetricsService } from './crawler-run-metrics.service';
import { CrawlerRunEventEntity } from './entity/crawler-run-event.entity';
import { CrawlerRunMetricEntity } from './entity/crawler-run-metric.entity';

@Module({
	imports: [TypeOrmModule.forFeature([CrawlerRunMetricEntity, CrawlerRunEventEntity])],
	controllers: [CrawlerRunMetricsController],
	providers: [CrawlerRunMetricsService, AbilityFactory],
	exports: [CrawlerRunMetricsService],
})
export class CrawlerRunMetricsModule {}
