import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
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
}
