import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
	ApiBody,
	ApiCreatedResponse,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
} from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { CrawlerRunMetricsService } from './crawler-run-metrics.service';
import { CrawlerRunMetricsIncomingDto } from './dto/incoming/crawler-run-metrics-incoming.dto';
import { CrawlerRunMetricsOutgoingDto } from './dto/outgoing/crawler-run-metrics-outgoing.dto';

// TODO: how to deal with auth here
@Controller('metrics/crawler-run')
export class CrawlerRunMetricsController {
	constructor(private readonly crawlerRunMetricsService: CrawlerRunMetricsService) {}

	@ApiOperation({ summary: 'Save metrics for a specific crawler run' })
	@ApiCreatedResponse({ description: 'Metrics saved successfully' })
	@ApiParam({ name: 'crawlerRunId', description: 'The ID of the crawler run' })
	@ApiBody({ type: CrawlerRunMetricsIncomingDto })
	@Post(':crawlerRunId')
	async saveCrawlerRunMetrics(
		@Param('crawlerRunId') crawlerRunId: string,
		@Body() metrics: CrawlerRunMetricsIncomingDto,
	): Promise<void> {
		return this.crawlerRunMetricsService.saveCrawlerRunMetrics(crawlerRunId, metrics);
	}

	@ApiOkResponse({
		description: 'Metrics retrieved successfully',
		type: CrawlerRunMetricsOutgoingDto,
	})
	@ApiOperation({ summary: 'Get metrics for a specific crawler run' })
	@ApiParam({ name: 'crawlerRunId', description: 'The ID of the crawler run' })
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@RequirePermission('read', 'crawler-run')
	@Get(':crawlerRunId')
	async getCrawlerRunMetrics(@Param('crawlerRunId') crawlerRunId: string) {
		return this.crawlerRunMetricsService.getMetricsByRunId(crawlerRunId);
	}
}
