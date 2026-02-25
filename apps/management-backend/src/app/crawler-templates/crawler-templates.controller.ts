import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
	ApiBody,
	ApiForbiddenResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
} from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CrawlerRunDto } from '../crawler-runs/dto/crawler-run.dto';
import { CrawlerRunParameterDto } from '../crawler-runs/dto/crawler-run-parameter.dto';
import { CrawlerTemplatesService } from './crawler-templates.service';
import { CrawlerTemplateDto } from './dto/crawler-template.dto';
import { CrawlerTemplatesFilterDto } from './dto/crawler-templates-filter.dto';

@Controller('crawler-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CrawlerTemplatesController {
	constructor(private readonly crawlerTemplatesService: CrawlerTemplatesService) {}

	@ApiOperation({ summary: 'Lists all Crawler Templates' })
	@ApiOkResponse({ type: [CrawlerTemplateDto], description: 'List of Crawler Templates' })
	@ApiForbiddenResponse({ description: 'You do not have permission to access crawler templates' })
	@RequirePermission('read', 'crawler-template')
	@Get()
	async listCrawlerTemplates(
		@Query() filterParams?: CrawlerTemplatesFilterDto,
	): Promise<CrawlerTemplateDto[]> {
		return this.crawlerTemplatesService.listCrawlerTemplates(filterParams);
	}

	@ApiOperation({ summary: 'Get a specific Crawler Template by name and namespace' })
	@ApiOkResponse({ type: CrawlerTemplateDto, description: 'The requested Crawler Template' })
	@ApiForbiddenResponse({ description: 'You do not have permission to access crawler templates' })
	@ApiNotFoundResponse({ description: 'The specified Crawler Template was not found' })
	@ApiParam({
		name: 'namespace',
		type: String,
		description: 'The Kubernetes Namespace where the crawler Template is located',
	})
	@ApiParam({
		name: 'templateName',
		type: String,
		description: 'The name of the crawler Template',
	})
	@RequirePermission('read', 'crawler-template')
	@Get(':namespace/:templateName')
	async getCrawlerTemplateByNamespaceAndName(
		@Param('namespace') namespace: string,
		@Param('templateName') templateName: string,
	): Promise<CrawlerTemplateDto> {
		return this.crawlerTemplatesService.getCrawlerTemplateByNamespaceAndName(
			namespace,
			templateName,
		);
	}

	@ApiOperation({ summary: 'Submit a run for a given crawler Template' })
	@ApiOkResponse({ type: CrawlerRunDto, description: 'The submitted crawler Run' })
	@ApiForbiddenResponse({ description: 'You do not have permission to submit crawler runs' })
	@ApiParam({
		name: 'namespace',
		type: String,
		description: 'The Kubernetes Namespace where the crawler Template is located',
	})
	@ApiParam({
		name: 'templateName',
		type: String,
		description: 'The name of the crawler Template',
	})
	@ApiBody({
		type: [CrawlerRunParameterDto],
		description: 'Optional parameters to pass to the crawler Template',
	})
	@RequirePermission('create', 'crawler-run')
	@Post(':namespace/:templateName/submit')
	async submitCrawlerTemplateRun(
		@Param('namespace') namespace: string,
		@Param('templateName') templateName: string,
		@Body() parameters?: CrawlerRunParameterDto[],
	): Promise<CrawlerRunDto> {
		return this.crawlerTemplatesService.submitCrawlerTemplateRun(
			namespace,
			templateName,
			parameters,
		);
	}
}
