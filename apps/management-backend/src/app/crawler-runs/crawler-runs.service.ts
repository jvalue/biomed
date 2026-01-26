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
	 * Get a Crawler Run by ID and namespace.
	 * @param runId The ID of the Crawler Run.
	 * @param runNamespace The namespace of the Crawler Run.
	 */
	async getCrawlerRun(runId: string, runNamespace: string): Promise<CrawlerRunDto> {
		const run = await this.orchestratorClientService.getCrawlerRunByNameAndNamespace(
			runId,
			runNamespace,
		);
		if (!run) {
			throw new NotFoundException(
				`Run ${runId} in namespace ${runNamespace} not found in orchestrator.`,
			);
		}
		return run;
	}
}
