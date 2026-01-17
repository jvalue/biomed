import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbilityFactory } from '../../auth/ability-factory';
import { CrawlerRunMetricsController } from './crawler-run-metrics.controller';
import { CrawlerRunMetricsService } from './crawler-run-metrics.service';
import { CrawlerRunMetricEntity } from './entity/crawler-run-metric.entity';

@Module({
	imports: [TypeOrmModule.forFeature([CrawlerRunMetricEntity])],
	controllers: [CrawlerRunMetricsController],
	providers: [CrawlerRunMetricsService, AbilityFactory],
	exports: [CrawlerRunMetricsService],
})
export class CrawlerRunMetricsModule {}
