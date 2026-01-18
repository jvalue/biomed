import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CursorBasedPaginationRequestDto } from '../pagination/dto/cursor-based-pagination-request.dto';
import { CursorBasedPaginationResponseDto } from '../pagination/dto/cursor-based-pagination-response.dto';
import { CrawlerRunsService } from './crawler-runs.service';
import { CrawlerRunDto } from './dto/crawler-run.dto';
import { CrawlerRunFilterDto } from './dto/crawler-run-filter.dto';

@Controller('crawler-runs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CrawlerRunsController {
	constructor(private readonly crawlerRunsService: CrawlerRunsService) {}

	@ApiOperation({ summary: 'Lists all crawler runs with pagination' })
	@ApiOkResponse({
		type: [CursorBasedPaginationResponseDto<CrawlerRunDto>],
		description: 'List of crawler runs with pagination',
	})
	@ApiForbiddenResponse({ description: 'You do not have permission to access crawler runs' })
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
	@RequirePermission('read', 'crawler-run')
	@Get(':runNamespace/:runId')
	async getCrawlerRun(
		@Param('runId') runId: string,
		@Param('runNamespace') runNamespace: string,
	): Promise<CrawlerRunDto> {
		return this.crawlerRunsService.getCrawlerRun(runId, runNamespace);
	}
}
