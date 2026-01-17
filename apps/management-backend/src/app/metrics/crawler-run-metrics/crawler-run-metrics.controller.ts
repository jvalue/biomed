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
import { CrawlerRunEventIncomingDto } from './dto/incoming/crawler-run-event-incoming.dto';
import { CrawlerRunMetricsIncomingDto } from './dto/incoming/crawler-run-metrics-incoming.dto';
import { CrawlerRunEventOutgoingDto } from './dto/outgoing/crawler-run-event-outgoing.dto';
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
		return this.crawlerRunMetricsService.saveCrawlerRunMetric(crawlerRunId, metrics);
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

	@ApiOperation({ summary: 'Save an event for a specific crawler run' })
	@ApiCreatedResponse({ description: 'Event saved successfully' })
	@ApiParam({ name: 'crawlerRunId', description: 'The ID of the crawler run' })
	@ApiBody({ type: CrawlerRunEventIncomingDto })
	@Post(':crawlerRunId/event')
	async saveCrawlerRunEvent(
		@Param('crawlerRunId') crawlerRunId: string,
		@Body() event: CrawlerRunEventIncomingDto,
	) {
		return this.crawlerRunMetricsService.saveCrawlerRunEvent(crawlerRunId, event);
	}

	@ApiParam({ name: 'crawlerRunId', description: 'The ID of the crawler run' })
	@ApiOperation({ summary: 'Get events for a specific crawler run' })
	@ApiOkResponse({
		description: 'Events retrieved successfully for the crawler run',
		type: [CrawlerRunEventOutgoingDto],
	})
	@ApiOperation({ summary: 'Get events for a specific crawler run' })
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@RequirePermission('read', 'crawler-run')
	@Get(':crawlerRunId/events')
	async getCrawlerRunEvents(@Param('crawlerRunId') crawlerRunId: string) {
		return this.crawlerRunMetricsService.getCrawlerRunEvents(crawlerRunId);
	}
}
