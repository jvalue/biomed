import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
	ApiBody,
	ApiCreatedResponse,
	ApiForbiddenResponse,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiSecurity,
} from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ApiKeyAuthGuard } from '../auth/guards/api-key-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CrawlerRunMetricsService } from '../metrics/crawler-run-metrics/crawler-run-metrics.service';
import { CrawlerRunEventIncomingDto } from '../metrics/crawler-run-metrics/dto/incoming/crawler-run-event-incoming.dto';
import { CrawlerRunMetricsIncomingDto } from '../metrics/crawler-run-metrics/dto/incoming/crawler-run-metrics-incoming.dto';
import { CrawlerRunEventOutgoingDto } from '../metrics/crawler-run-metrics/dto/outgoing/crawler-run-event-outgoing.dto';
import { CrawlerRunMetricsOutgoingDto } from '../metrics/crawler-run-metrics/dto/outgoing/crawler-run-metrics-outgoing.dto';
import { CursorBasedPaginationRequestDto } from '../pagination/dto/cursor-based-pagination-request.dto';
import { CursorBasedPaginationResponseDto } from '../pagination/dto/cursor-based-pagination-response.dto';
import { CrawlerRunsService } from './crawler-runs.service';
import { CrawlerRunDto } from './dto/crawler-run.dto';
import { CrawlerRunFilterDto } from './dto/crawler-run-filter.dto';

@Controller('crawler-runs')
export class CrawlerRunsController {
	constructor(
		private readonly crawlerRunsService: CrawlerRunsService,
		private readonly crawlerRunMetricsService: CrawlerRunMetricsService,
	) {}

	@ApiOperation({ summary: 'Lists all crawler runs with pagination' })
	@ApiOkResponse({
		type: [CursorBasedPaginationResponseDto<CrawlerRunDto>],
		description: 'List of crawler runs with pagination',
	})
	@ApiForbiddenResponse({ description: 'You do not have permission to access crawler runs' })
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@RequirePermission('read', 'crawler-run')
	@Get()
	async listCrawlerRuns(
		@Query() filterParams?: CrawlerRunFilterDto,
		@Query() paginationParams?: CursorBasedPaginationRequestDto,
	): Promise<CursorBasedPaginationResponseDto<CrawlerRunDto>> {
		return this.crawlerRunsService.listCrawlerRuns(filterParams, paginationParams);
	}

	@ApiOperation({ summary: 'Get a crawler run by ID and namespace' })
	@ApiOkResponse({
		type: CrawlerRunDto,
		description: 'The requested crawler run',
	})
	@ApiParam({ name: 'runNamespace', description: 'The namespace of the crawler run' })
	@ApiParam({ name: 'runId', description: 'The ID of the crawler run' })
	@ApiForbiddenResponse({ description: 'You do not have permission to access this crawler run' })
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@RequirePermission('read', 'crawler-run')
	@Get(':runNamespace/:runId')
	async getCrawlerRun(
		@Param('runId') runId: string,
		@Param('runNamespace') runNamespace: string,
	): Promise<CrawlerRunDto> {
		return this.crawlerRunsService.getCrawlerRun(runId, runNamespace);
	}

	@ApiOperation({ summary: 'Save metrics for a specific crawler run' })
	@ApiCreatedResponse({ description: 'Metrics saved successfully' })
	@ApiParam({ name: 'runId', description: 'The ID of the crawler run' })
	@ApiParam({ name: 'runNamespace', description: 'The namespace of the crawler run' })
	@ApiBody({ type: CrawlerRunMetricsIncomingDto })
	@ApiSecurity('api-key')
	@UseGuards(ApiKeyAuthGuard)
	@Post(':runNamespace/:runId/metrics')
	async saveCrawlerRunMetrics(
		@Param('runId') crawlerRunId: string,
		@Param('runNamespace') runNamespace: string,
		@Body() metrics: CrawlerRunMetricsIncomingDto,
	): Promise<void> {
		return this.crawlerRunMetricsService.saveCrawlerRunMetric(crawlerRunId, runNamespace, metrics);
	}

	@ApiOkResponse({
		description: 'Metrics retrieved successfully',
		type: CrawlerRunMetricsOutgoingDto,
	})
	@ApiOperation({ summary: 'Get metrics for a specific crawler run' })
	@ApiParam({ name: 'runId', description: 'The ID of the crawler run' })
	@ApiParam({ name: 'runNamespace', description: 'The namespace of the crawler run' })
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@RequirePermission('read', 'crawler-run')
	@Get(':runNamespace/:runId/metrics')
	async getCrawlerRunMetrics(
		@Param('runId') crawlerRunId: string,
		@Param('runNamespace') runNamespace: string,
	) {
		return this.crawlerRunMetricsService.getMetricsByRunId(crawlerRunId, runNamespace);
	}

	@ApiOperation({ summary: 'Save an event for a specific crawler run' })
	@ApiCreatedResponse({ description: 'Event saved successfully' })
	@ApiParam({ name: 'runId', description: 'The ID of the crawler run' })
	@ApiParam({ name: 'runNamespace', description: 'The namespace of the crawler run' })
	@ApiBody({ type: CrawlerRunEventIncomingDto })
	@Post(':runNamespace/:runId/events')
	@ApiSecurity('api-key')
	@UseGuards(ApiKeyAuthGuard)
	async saveCrawlerRunEvent(
		@Param('runId') crawlerRunId: string,
		@Param('runNamespace') runNamespace: string,
		@Body() event: CrawlerRunEventIncomingDto,
	) {
		return this.crawlerRunMetricsService.saveCrawlerRunEvent(crawlerRunId, runNamespace, event);
	}

	@ApiParam({ name: 'runId', description: 'The ID of the crawler run' })
	@ApiParam({ name: 'runNamespace', description: 'The namespace of the crawler run' })
	@ApiOperation({ summary: 'Get events for a specific crawler run' })
	@ApiOkResponse({
		description: 'Events retrieved successfully for the crawler run',
		type: [CrawlerRunEventOutgoingDto],
	})
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@RequirePermission('read', 'crawler-run')
	@Get(':runNamespace/:runId/events')
	async getCrawlerRunEvents(
		@Param('runId') crawlerRunId: string,
		@Param('runNamespace') runNamespace: string,
	) {
		return this.crawlerRunMetricsService.getCrawlerRunEvents(crawlerRunId, runNamespace);
	}
}
