import { Injectable } from '@nestjs/common';
import { CrawlerRunDto } from '../crawler-runs/dto/crawler-run.dto';
import { CrawlerRunParameterDto } from '../crawler-runs/dto/crawler-run-parameter.dto';
import { ArgoClientService } from '../orchestrator-client/argo-client/argo-client.service';
import { CrawlerTemplateDto } from './dto/crawler-template.dto';
import { CrawlerTemplatesFilterDto } from './dto/crawler-templates-filter.dto';

@Injectable()
export class CrawlerTemplatesService {
	constructor(private readonly orchestratorClientService: ArgoClientService) {}

	/**
	 * Lists all crawler Templates.
	 * @param filter Optional filtering options
	 */
	async listCrawlerTemplates(filter?: CrawlerTemplatesFilterDto): Promise<CrawlerTemplateDto[]> {
		const templates = await this.orchestratorClientService.listCrawlerTemplates(filter);
		// Sort by date created descending
		return templates.sort((a: CrawlerTemplateDto, b: CrawlerTemplateDto) => {
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		});
	}

	/**
	 * Submits a new crawler Run from a crawler Template.
	 * @param templateName
	 * @param namespace
	 * @param parameters
	 */
	async submitCrawlerTemplateRun(
		templateName: string,
		namespace: string,
		parameters?: CrawlerRunParameterDto[],
	): Promise<CrawlerRunDto> {
		return this.orchestratorClientService.submitCrawlerRunFromCrawlerTemplate(
			templateName,
			namespace,
			parameters,
		);
	}
}
