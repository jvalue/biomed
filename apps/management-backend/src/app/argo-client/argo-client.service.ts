import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { CrawlerRunDto } from '../crawler-runs/dto/crawler-run.dto';
import { CrawlerRunFilterDto } from '../crawler-runs/dto/crawler-run-filter.dto';
import { CrawlerRunParameterDto } from '../crawler-runs/dto/crawler-run-parameter.dto';
import { CrawlerTemplateDto } from '../crawler-templates/dto/crawler-template.dto';
import { CrawlerTemplatesFilterDto } from '../crawler-templates/dto/crawler-templates-filter.dto';
import { EnvironmentVariables } from '../env.validation';
import { HealthStatusEnum } from '../health/enum/healthStatus.enum';
import { IOrchestratorClient } from '../orchestrators/orchestrator-client.interface';
import { CursorBasedPaginationRequestDto } from '../pagination/dto/cursor-based-pagination-request.dto';
import { CursorBasedPaginationResponseDto } from '../pagination/dto/cursor-based-pagination-response.dto';
import { ScheduleDto } from '../schedules/dto/schedule.dto';
import { ArgoCronWorkflow } from '../schedules/infrastructure/argo/argo-cron-workflow';
import { ArgoAuthService } from './argo-auth/argo-auth.service';
import { ArgoCursorPaginatedListDto } from './dto/argo-cursor-paginated-list-dto';
import { ArgoCronWorkflowDto } from './dto/cron-workflows/argo-cron-workflow.dto';
import { ArgoWorkflowRunDto } from './dto/workflow-runs/argo-workflow-run.dto';
import { ArgoWorkflowTemplateDto } from './dto/workflow-templates/argo-workflow-template.dto';
import {
	mapArgoCronWorkflowDtoToScheduleDto,
	mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto,
	mapArgoWorkflowRunDtoToWorkflowRunDto,
	mapArgoWorkflowTemplateDtoToWorkflowTemplateDto,
} from './mapper/argo.mapper';
import { ArgoQueryParamBuilder } from './utils/argo-query-param-builder';

/**
 * Service to interact with Argo Workflows API
 */
@Injectable()
export class ArgoClientService implements IOrchestratorClient {
	private readonly logger = new Logger(ArgoClientService.name);
	private readonly http: AxiosInstance;

	constructor(
		argoAuthService: ArgoAuthService,
		configService: ConfigService<EnvironmentVariables, true>,
	) {
		const argoBaseUrl = configService.get<string>('ARGO_BASE_URL');
		const token = `Bearer ${argoAuthService.getAuthToken()}`;
		this.http = axios.create({
			baseURL: argoBaseUrl,
			timeout: 10000,
			headers: {
				Authorization: token ? `${token}` : undefined,
				Accept: 'application/json',
			},
		});
	}

	/**
	 * Health check for Argo Workflows API by calling the templates endpoint
	 * @return Health status of the Argo Workflows API (LIMITED for return code 4xx, DOWN for 5xx or network errors, AVAILABLE otherwise)
	 */
	async checkHealth(): Promise<HealthStatusEnum> {
		this.logger.log('Checking health of Argo Workflows API');

		try {
			const res = await this.http.get('/workflow-templates/');
			const statusCode = res.status;

			if (statusCode >= 500) {
				return HealthStatusEnum.DOWN;
			} else if (statusCode >= 400) {
				return HealthStatusEnum.LIMITED;
			} else {
				return HealthStatusEnum.AVAILABLE;
			}
		} catch (err) {
			// Check if the error has a response (HTTP error)
			if (err.response) {
				const statusCode = err.response.status;
				if (statusCode >= 500) {
					return HealthStatusEnum.DOWN;
				} else if (statusCode >= 400) {
					return HealthStatusEnum.LIMITED;
				}
			}
			// Network or other error
			this.logger.error('Error checking health of Argo Workflows API:', err);
			return HealthStatusEnum.DOWN;
		}
	}

	/**
	 * List all current workflows in all namespaces
	 * @param filterOptions Filtering options
	 * @param paginationOptions Options for cursor-based pagination
	 */
	async listCrawlerRuns(
		filterOptions?: CrawlerRunFilterDto,
		paginationOptions?: CursorBasedPaginationRequestDto,
	): Promise<CursorBasedPaginationResponseDto<CrawlerRunDto>> {
		this.logger.log('Listing workflows from Argo Workflows API');
		const requestedFields = [
			'metadata.continue',
			'items.metadata.name',
			'items.metadata.namespace',
			'items.status.phase',
			'items.status.startedAt',
			'items.status.finishedAt',
			'items.metadata.labels',
		];

		const argoQueryParamBuilder = new ArgoQueryParamBuilder();
		// Label selectors
		argoQueryParamBuilder.addLabelSelector(
			'workflows.argoproj.io/workflow-template',
			filterOptions?.crawlerTemplateName,
		);
		argoQueryParamBuilder.addLabelSelector(
			'workflows.argoproj.io/cron-workflow',
			filterOptions?.scheduleName,
		);
		argoQueryParamBuilder.addLabelSelector('workflows.argoproj.io/phase', filterOptions?.phases);

		// Normal query parameters
		argoQueryParamBuilder.add('createdAfter', filterOptions?.startedAfter?.toISOString());
		argoQueryParamBuilder.add('finishedBefore', filterOptions?.finishedBefore?.toISOString());
		argoQueryParamBuilder.add('listOptions.limit', paginationOptions?.limit);
		argoQueryParamBuilder.add('listOptions.continue', paginationOptions?.offset);

		// Required fields
		argoQueryParamBuilder.add('fields', requestedFields);

		const queryParams = argoQueryParamBuilder.build();

		// Construct URL

		let url = filterOptions?.namespace ? `/workflows/${filterOptions.namespace}` : `/workflows/`;
		if (queryParams) {
			url += `${queryParams}`;
		}
		this.logger.debug('Constructed URL for listing workflows:', url);

		const res = await this.http.get(url);
		const workflowsResponse: ArgoCursorPaginatedListDto<ArgoWorkflowRunDto> = res.data;

		this.logger.debug('Argo Workflows API response:', workflowsResponse);

		// Map ArgoCursorPaginatedListDto<ArgoWorkflowRunDto> to CursorBasedPaginationResponseDto<CrawlerRunDto>
		const mappedResponse = mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto(
			workflowsResponse,
			mapArgoWorkflowRunDtoToWorkflowRunDto,
		);

		// Enrich workflow runs started by cron workflows with the workflow template name
		mappedResponse.data = await this.enrichWorkflowRunsWithCronWorkflowTemplateName(
			mappedResponse.data,
		);
		return mappedResponse;
	}

	/**
	 * List all workflow templates
	 * @param filterOptions
	 */
	async listCrawlerTemplates(
		filterOptions?: CrawlerTemplatesFilterDto,
	): Promise<CrawlerTemplateDto[]> {
		this.logger.log('Listing workflow templates from Argo Workflows API');

		const argoQueryParamBuilder = new ArgoQueryParamBuilder();

		// Normal query parameters
		argoQueryParamBuilder.add('namePattern', filterOptions?.nameSearchString);

		const queryParams = argoQueryParamBuilder.build();

		// Construct URL
		let url = filterOptions?.namespace
			? `/workflow-templates/${filterOptions.namespace}`
			: `/workflow-templates/`;
		if (queryParams) {
			url += `${queryParams}`;
		}
		this.logger.debug('Constructed URL for listing workflow templates:', url);

		const res = await this.http.get(url);
		const templatesResponse: ArgoWorkflowTemplateDto[] = res.data?.items;

		this.logger.debug('Argo Workflows API response for templates:', templatesResponse);

		// Map ArgoWorkflowTemplateDto[] to CrawlerTemplateDto[] as we do not offer pagination here
		return templatesResponse?.map(mapArgoWorkflowTemplateDtoToWorkflowTemplateDto) ?? [];
	}

	/**
	 * Submit a new workflow based on a workflow template
	 * @param crawlerTemplateName Name of the workflow template to use
	 * @param crawlerTemplateNamespace Namespace of the workflow template
	 * @param parameters Parameters to pass to the workflow
	 */
	async submitCrawlerRunFromCrawlerTemplate(
		crawlerTemplateName: string,
		crawlerTemplateNamespace: string,
		parameters?: CrawlerRunParameterDto[],
	): Promise<CrawlerRunDto> {
		this.logger.log(
			`Starting new workflow from template ${crawlerTemplateName} in namespace ${crawlerTemplateNamespace}`,
		);
		if (parameters) {
			this.logger.debug(`With parameters: ${JSON.stringify(parameters)}`);
		}

		const body = {
			namespace: crawlerTemplateNamespace,
			resourceKind: 'WorkflowTemplate',
			resourceName: crawlerTemplateName,
			submitOptions: {
				parameters: (parameters ?? []).map((param) => `${param.name}=${param.value}`),
			},
		};
		const url = `/workflows/${crawlerTemplateNamespace}/submit`;

		try {
			const res = await this.http.post(url, body);
			const workflowResponse: ArgoWorkflowRunDto = res.data;

			this.logger.debug('Argo Workflows API response for started workflow:', workflowResponse);

			// Map ArgoWorkflowRunDto to CrawlerRunDto
			return mapArgoWorkflowRunDtoToWorkflowRunDto(workflowResponse);
		} catch (err) {
			this.logger.error(
				`Error starting workflow from template "${crawlerTemplateName}" in namespace "${crawlerTemplateNamespace}". ` +
					`Parameters: ${JSON.stringify(parameters ?? [])}. URL: ${url}. Body: ${JSON.stringify(body)}.`,
				err instanceof Error ? err.stack : undefined,
				'ArgoClientService',
			);
			throw err;
		}
	}

	/**
	 * Get all cron workflows and map them to schedules
	 * @return List of schedules
	 */
	async listSchedules(): Promise<ScheduleDto[]> {
		this.logger.log('Getting cron workflows from Argo Workflows API');

		const url = `/cron-workflows/`;

		const res = await this.http.get(url);
		const cronWorkflowsResponse: ArgoCronWorkflowDto[] = res.data?.items;
		this.logger.debug('Argo Workflows API response for cron workflows:', cronWorkflowsResponse);

		// Filter cron workflows that reference workflow templates
		const filteredCronWorkflows =
			this.filterCronWorkflowsReferencingWorkflowTemplates(cronWorkflowsResponse);

		// Map ArgoCronWorkflowDto[] to ScheduleDto[]
		return filteredCronWorkflows?.map(mapArgoCronWorkflowDtoToScheduleDto) ?? [];
	}

	/**
	 * Get a cron workflow by name and namespace
	 * @param name Name of the cron workflow
	 * @param namespace Namespace of the cron workflow
	 * @return The cron workflow as ScheduleDto
	 */
	async getScheduleByNameAndNamespace(
		name: string,
		namespace: string,
	): Promise<ScheduleDto | null> {
		this.logger.log(
			`Getting cron workflow ${name} from namespace ${namespace} from Argo Workflows API`,
		);

		const url = `/cron-workflows/${namespace}/${name}`;

		try {
			const res = await this.http.get(url);
			const cronWorkflowResponse: ArgoCronWorkflowDto = res.data;
			this.logger.debug('Argo Workflows API response for cron workflow:', cronWorkflowResponse);

			// Check if the cron workflow references a workflow template
			if (!cronWorkflowResponse.spec.workflowSpec.workflowTemplateRef?.name) {
				this.logger.warn(
					`Cron workflow ${name} in namespace ${namespace} does not reference a workflow template`,
				);
				return null;
			}

			// Map ArgoCronWorkflowDto to ScheduleDto
			return mapArgoCronWorkflowDtoToScheduleDto(cronWorkflowResponse);
		} catch (err) {
			if (err.response && err.response.status === 404) {
				this.logger.log(`Cron workflow ${name} in namespace ${namespace} not found`);
				return null;
			}
			this.logger.error(`Error getting cron workflow ${name} from namespace ${namespace}:`, err);
			throw err;
		}
	}

	/**
	 * Creates a cron workflow schedule
	 * @param cronWorkflowObject The cron workflow object to create
	 * @param namespace The namespace to create the cron workflow in
	 */
	async createSchedule(cronWorkflowObject: ArgoCronWorkflow, namespace: string): Promise<void> {
		this.logger.log(`Creating new cron workflow via Argo Workflows API`);

		const url = `/cron-workflows/${namespace}`;

		const body = {
			cronWorkflow: cronWorkflowObject,
		};

		try {
			await this.http.post(url, body);
			this.logger.log(`Cron workflow created successfully`);
		} catch (err) {
			this.logger.error(`Error creating cron workflow:`, err);
			throw err;
		}
	}

	/**
	 * Delete a cron workflow by name and namespace
	 * @param name Name of the cron workflow
	 * @param namespace Namespace of the cron workflow
	 */
	async deleteSchedule(name: string, namespace: string): Promise<void> {
		this.logger.log(
			`Deleting cron workflow ${name} in namespace ${namespace} via Argo Workflows API`,
		);

		const url = `/cron-workflows/${namespace}/${name}`;

		try {
			await this.http.delete(url);
			this.logger.log(`Cron workflow ${name} in namespace ${namespace} deleted successfully`);
		} catch (err) {
			this.logger.error(`Error deleting cron workflow ${name} in namespace ${namespace}:`, err);
			throw err;
		}
	}

	/**
	 * Suspend a cron workflow by name and namespace
	 * @param name Name of the cron workflow
	 * @param namespace Namespace of the cron workflow
	 */
	async suspendSchedule(name: string, namespace: string): Promise<void> {
		this.logger.log(
			`Suspending cron workflow ${name} in namespace ${namespace} via Argo Workflows API`,
		);

		const url = `/cron-workflows/${namespace}/${name}/suspend`;

		try {
			await this.http.put(url);
			this.logger.log(`Cron workflow ${name} in namespace ${namespace} suspended successfully`);
		} catch (err) {
			this.logger.error(`Error suspending cron workflow ${name} in namespace ${namespace}:`, err);
			throw err;
		}
	}

	/**
	 * Resume a cron workflow by name and namespace
	 * @param name Name of the cron workflow
	 * @param namespace Namespace of the cron workflow
	 */
	async resumeSchedule(name: string, namespace: string): Promise<void> {
		this.logger.log(
			`Resuming cron workflow ${name} in namespace ${namespace} via Argo Workflows API`,
		);

		const url = `/cron-workflows/${namespace}/${name}/resume`;

		try {
			await this.http.put(url);
			this.logger.log(`Cron workflow ${name} in namespace ${namespace} resumed successfully`);
		} catch (err) {
			this.logger.error(`Error resuming cron workflow ${name} in namespace ${namespace}:`, err);
			throw err;
		}
	}

	/**
	 * Filter cron workflows that reference workflow templates
	 * @param ArgoCronWorkflows
	 * @private
	 */
	filterCronWorkflowsReferencingWorkflowTemplates(
		ArgoCronWorkflows: ArgoCronWorkflowDto[],
	): ArgoCronWorkflowDto[] {
		return ArgoCronWorkflows.filter(
			(cronWorkflow) => cronWorkflow.spec.workflowSpec.workflowTemplateRef?.name,
		);
	}

	/**
	 * Cron Workflows start workflow runs without setting the workflow template name label.
	 * This method enriches the workflow runs with the correct workflow template name by looking up the cron
	 * workflow for all of those cron workflow runs which haven't added the workflow template name by custom label.
	 * @param runs Workflow runs to enrich
	 */
	async enrichWorkflowRunsWithCronWorkflowTemplateName(
		runs: CrawlerRunDto[],
	): Promise<CrawlerRunDto[]> {
		const enrichedRuns: CrawlerRunDto[] = [];

		for (const run of runs) {
			if (!run.crawlerTemplateName && run.scheduleName) {
				const schedule = await this.getScheduleByNameAndNamespace(run.scheduleName, run.namespace);
				if (schedule) {
					run.crawlerTemplateName = schedule.crawlerTemplateName;
				}
			}
			enrichedRuns.push(run);
		}

		return enrichedRuns;
	}
}
