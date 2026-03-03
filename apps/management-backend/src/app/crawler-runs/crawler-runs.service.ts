import { Injectable, NotFoundException } from '@nestjs/common';
import { ArgoClientService } from '../orchestrator-client/argo-client/argo-client.service';
import { CursorBasedPaginationRequestDto } from '../pagination/dto/cursor-based-pagination-request.dto';
import { CursorBasedPaginationResponseDto } from '../pagination/dto/cursor-based-pagination-response.dto';
import { CrawlerRunDto } from './dto/crawler-run.dto';
import { CrawlerRunFilterDto } from './dto/crawler-run-filter.dto';

@Injectable()
export class CrawlerRunsService {
	constructor(private readonly orchestratorClientService: ArgoClientService) {}

	/**
	 * Lists all Crawler Runs.
	 * @param filter Optional filtering options
	 * @param pagination Optional pagination options
	 */
	async listCrawlerRuns(
		filter?: CrawlerRunFilterDto,
		pagination?: CursorBasedPaginationRequestDto,
	): Promise<CursorBasedPaginationResponseDto<CrawlerRunDto>> {
		return this.orchestratorClientService.listCrawlerRuns(filter, pagination);
	}

	/**
	 * Get a Crawler Run by namespace and name.
	 * @param runNamespace The namespace of the Crawler Run.
	 * @param runName The name of the Crawler Run.
	 */
	async getCrawlerRun(runNamespace: string, runName: string): Promise<CrawlerRunDto> {
		const run = await this.orchestratorClientService.getCrawlerRunByNamespaceAndName(
			runNamespace,
			runName,
		);
		if (!run) {
			throw new NotFoundException(
				`Run ${runName} in namespace ${runNamespace} not found in orchestrator.`,
			);
		}
		return run;
	}
}
