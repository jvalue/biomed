import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
	ApiBody,
	ApiCreatedResponse,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiSecurity,
} from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { ApiKeyAuthGuard } from '../../auth/guards/api-key-auth.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { CrawlerRunMetricsService } from './crawler-run-metrics.service';
import { CrawlerRunEventIncomingDto } from './dto/incoming/crawler-run-event-incoming.dto';
import { CrawlerRunMetricsIncomingDto } from './dto/incoming/crawler-run-metrics-incoming.dto';
import { CrawlerRunEventOutgoingDto } from './dto/outgoing/crawler-run-event-outgoing.dto';
import { CrawlerRunMetricsOutgoingDto } from './dto/outgoing/crawler-run-metrics-outgoing.dto';

@Controller('metrics/crawler-run')
export class CrawlerRunMetricsController {
	constructor(private readonly crawlerRunMetricsService: CrawlerRunMetricsService) {}

	@ApiOperation({ summary: 'Save metrics for a specific crawler run' })
	@ApiCreatedResponse({ description: 'Metrics saved successfully' })
	@ApiParam({ name: 'crawlerRunId', description: 'The ID of the crawler run' })
	@ApiParam({ name: 'crawlerRunNamespace', description: 'The namespace of the crawler run' })
	@ApiBody({ type: CrawlerRunMetricsIncomingDto })
	@Post(':crawlerRunNamespace/:crawlerRunId')
	@ApiSecurity('api-key')
	@UseGuards(ApiKeyAuthGuard)
	async saveCrawlerRunMetrics(
		@Param('crawlerRunId') crawlerRunId: string,
		@Param('crawlerRunNamespace') runNamespace: string,
		@Body() metrics: CrawlerRunMetricsIncomingDto,
	): Promise<void> {
		return this.crawlerRunMetricsService.saveCrawlerRunMetric(crawlerRunId, runNamespace, metrics);
	}

	@ApiOkResponse({
		description: 'Metrics retrieved successfully',
		type: CrawlerRunMetricsOutgoingDto,
	})
	@ApiOperation({ summary: 'Get metrics for a specific crawler run' })
	@ApiParam({ name: 'crawlerRunId', description: 'The ID of the crawler run' })
	@ApiParam({ name: 'crawlerRunNamespace', description: 'The namespace of the crawler run' })
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@RequirePermission('read', 'crawler-run')
	@Get(':crawlerRunNamespace/:crawlerRunId')
	async getCrawlerRunMetrics(
		@Param('crawlerRunId') crawlerRunId: string,
		@Param('crawlerRunNamespace') runNamespace: string,
	) {
		return this.crawlerRunMetricsService.getMetricsByRunId(crawlerRunId, runNamespace);
	}

	@ApiOperation({ summary: 'Save an event for a specific crawler run' })
	@ApiCreatedResponse({ description: 'Event saved successfully' })
	@ApiParam({ name: 'crawlerRunId', description: 'The ID of the crawler run' })
	@ApiParam({ name: 'crawlerRunNamespace', description: 'The namespace of the crawler run' })
	@ApiBody({ type: CrawlerRunEventIncomingDto })
	@Post(':crawlerRunNamespace/:crawlerRunId/event')
	@ApiSecurity('api-key')
	@UseGuards(ApiKeyAuthGuard)
	async saveCrawlerRunEvent(
		@Param('crawlerRunId') crawlerRunId: string,
		@Param('crawlerRunNamespace') runNamespace: string,
		@Body() event: CrawlerRunEventIncomingDto,
	) {
		return this.crawlerRunMetricsService.saveCrawlerRunEvent(crawlerRunId, runNamespace, event);
	}

	@ApiParam({ name: 'crawlerRunId', description: 'The ID of the crawler run' })
	@ApiParam({ name: 'crawlerRunNamespace', description: 'The namespace of the crawler run' })
	@ApiOperation({ summary: 'Get events for a specific crawler run' })
	@ApiOkResponse({
		description: 'Events retrieved successfully for the crawler run',
		type: [CrawlerRunEventOutgoingDto],
	})
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@RequirePermission('read', 'crawler-run')
	@Get(':crawlerRunNamespace/:crawlerRunId/events')
	async getCrawlerRunEvents(
		@Param('crawlerRunId') crawlerRunId: string,
		@Param('crawlerRunNamespace') runNamespace: string,
	) {
		return this.crawlerRunMetricsService.getCrawlerRunEvents(crawlerRunId, runNamespace);
	}
}
