import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { CrawlerRunDto } from '../../crawler-runs/dto/crawler-run.dto';
import { CrawlerRunFilterDto } from '../../crawler-runs/dto/crawler-run-filter.dto';
import { CrawlerRunParameterDto } from '../../crawler-runs/dto/crawler-run-parameter.dto';
import { CrawlerTemplateDto } from '../../crawler-templates/dto/crawler-template.dto';
import { CrawlerTemplatesFilterDto } from '../../crawler-templates/dto/crawler-templates-filter.dto';
import { EnvironmentVariables } from '../../env.validation';
import { HealthStatusEnum } from '../../health/enum/healthStatus.enum';
import { attachAxiosLogging } from '../../logging';
import { CursorBasedPaginationRequestDto } from '../../pagination/dto/cursor-based-pagination-request.dto';
import { CursorBasedPaginationResponseDto } from '../../pagination/dto/cursor-based-pagination-response.dto';
import { ScheduleDto } from '../../schedules/dto/schedule.dto';
import { ArgoCronWorkflow } from '../../schedules/infrastructure/argo/argo-cron-workflow';
import { IOrchestratorClient } from '../orchestrator-client.interface';
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

		// Attach centralized logging for all outgoing requests to Argo
		attachAxiosLogging(this.http, this.logger);
	}

	/**
	 * Health check for Argo Workflows API by calling the templates endpoint
	 * @return Health status of the Argo Workflows API (LIMITED for return code 4xx, DOWN for 5xx or network errors, AVAILABLE otherwise)
	 */
	async checkHealth(): Promise<HealthStatusEnum> {
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
			// Filtering will only work if this label is set in the workflow template and passed down to the workflow run.
			// If the label is not set, these runs will noch be included. This is a trade-off we accept in order to
			// be able to filter for workflow template name for scheduled runs
			'customSetWorkflowTemplateName',
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

		const res = await this.http.get(url);
		const workflowsResponse: ArgoCursorPaginatedListDto<ArgoWorkflowRunDto> = res.data;

		// Map ArgoCursorPaginatedListDto<ArgoWorkflowRunDto> to CursorBasedPaginationResponseDto<CrawlerRunDto>
		const mappedResponse = mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto(
			workflowsResponse,
			mapArgoWorkflowRunDtoToWorkflowRunDto,
		);

		// Enrich workflow runs started by cron workflows with the workflow template name
		mappedResponse.data = await Promise.all(
			mappedResponse.data.map((run) => this.enrichWorkflowRunWithCronWorkflowTemplateName(run)),
		);
		return mappedResponse;
	}

	/**
	 * Get a workflow run by namespace and name
	 * @param namespace Namespace of the workflow run
	 * @param name Name of the workflow run
	 * @return The workflow run as CrawlerRunDto or null if not found
	 */
	async getCrawlerRunByNamespaceAndName(
		namespace: string,
		name: string,
	): Promise<CrawlerRunDto | null> {
		const url = `/workflows/${namespace}/${name}`;

		try {
			const res = await this.http.get(url);
			const workflowResponse: ArgoWorkflowRunDto = res.data;

			// Map ArgoWorkflowRunDto to CrawlerRunDto
			const mappedRun = mapArgoWorkflowRunDtoToWorkflowRunDto(workflowResponse);

			// Enrich single workflow run started by cron workflow with the workflow template name
			return await this.enrichWorkflowRunWithCronWorkflowTemplateName(mappedRun);
		} catch (err) {
			if (err.response && err.response.status === 404) {
				return null;
			}
			throw err;
		}
	}

	/**
	 * List all workflow templates
	 * @param filterOptions
	 */
	async listCrawlerTemplates(
		filterOptions?: CrawlerTemplatesFilterDto,
	): Promise<CrawlerTemplateDto[]> {
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

		const res = await this.http.get(url);
		const templatesResponse: ArgoWorkflowTemplateDto[] = res.data?.items;

		// Map ArgoWorkflowTemplateDto[] to CrawlerTemplateDto[] as we do not offer pagination here
		return templatesResponse?.map(mapArgoWorkflowTemplateDtoToWorkflowTemplateDto) ?? [];
	}

	/**
	 * Get a workflow template by namespace and name
	 * @param namespace Namespace of the workflow template
	 * @param name Name of the workflow template
	 * @return The workflow template as CrawlerTemplateDto
	 */
	async getCrawlerTemplateByNamespaceAndName(
		namespace: string,
		name: string,
	): Promise<CrawlerTemplateDto | null> {
		const url = `/workflow-templates/${namespace}/${name}`;

		try {
			const res = await this.http.get(url);
			const templateResponse: ArgoWorkflowTemplateDto = res.data;

			// Map ArgoWorkflowTemplateDto to CrawlerTemplateDto
			return mapArgoWorkflowTemplateDtoToWorkflowTemplateDto(templateResponse);
		} catch (err) {
			if (err.response && err.response.status === 404) {
				return null;
			}
			throw err;
		}
	}

	/**
	 * Submit a new workflow based on a workflow template
	 * @param crawlerTemplateNamespace Namespace of the workflow template
	 * @param crawlerTemplateName Name of the workflow template to use
	 * @param parameters Parameters to pass to the workflow
	 */
	async submitCrawlerRunFromCrawlerTemplate(
		crawlerTemplateNamespace: string,
		crawlerTemplateName: string,
		parameters?: CrawlerRunParameterDto[],
	): Promise<CrawlerRunDto> {
		const body = {
			namespace: crawlerTemplateNamespace,
			resourceKind: 'WorkflowTemplate',
			resourceName: crawlerTemplateName,
			submitOptions: {
				parameters: (parameters ?? []).map((param) => `${param.name}=${param.value}`),
			},
		};
		const url = `/workflows/${crawlerTemplateNamespace}/submit`;

		const res = await this.http.post(url, body);
		const workflowResponse: ArgoWorkflowRunDto = res.data;

		// Map ArgoWorkflowRunDto to CrawlerRunDto
		return mapArgoWorkflowRunDtoToWorkflowRunDto(workflowResponse);
	}

	/**
	 * Get all cron workflows and map them to schedules
	 * @return List of schedules
	 */
	async listSchedules(): Promise<ScheduleDto[]> {
		const url = `/cron-workflows/`;

		const res = await this.http.get(url);
		const cronWorkflowsResponse: ArgoCronWorkflowDto[] = res.data?.items;

		// Filter cron workflows that reference workflow templates
		const filteredCronWorkflows =
			this.filterCronWorkflowsReferencingWorkflowTemplates(cronWorkflowsResponse);

		// Map ArgoCronWorkflowDto[] to ScheduleDto[]
		return filteredCronWorkflows?.map(mapArgoCronWorkflowDtoToScheduleDto) ?? [];
	}

	/**
	 * Get a cron workflow by namespace and name
	 * @param namespace Namespace of the cron workflow
	 * @param name Name of the cron workflow
	 * @return The cron workflow as ScheduleDto
	 */
	async getScheduleByNamespaceAndName(
		namespace: string,
		name: string,
	): Promise<ScheduleDto | null> {
		const url = `/cron-workflows/${namespace}/${name}`;

		try {
			const res = await this.http.get(url);
			const cronWorkflowResponse: ArgoCronWorkflowDto = res.data;

			// Check if the cron workflow references a workflow template
			if (!cronWorkflowResponse.spec.workflowSpec.workflowTemplateRef?.name) {
				return null;
			}

			// Map ArgoCronWorkflowDto to ScheduleDto
			return mapArgoCronWorkflowDtoToScheduleDto(cronWorkflowResponse);
		} catch (err) {
			if (err.response && err.response.status === 404) {
				return null;
			}
			throw err;
		}
	}

	/**
	 * Get a cron workflow by namespace and name (similar to getScheduleByNamespaceAndName but returns the raw ArgoCronWorkflow object)
	 * @param namespace The namespace of the cron workflow
	 * @param name The name of the cron workflow
	 */
	async getCronWorkflow(namespace: string, name: string): Promise<ArgoCronWorkflow | null> {
		const url = `/cron-workflows/${namespace}/${name}`;

		try {
			const response = await this.http.get<ArgoCronWorkflow>(url);
			return response.data;
		} catch (err) {
			if (err.response && err.response.status === 404) {
				return null;
			}
			throw err;
		}
	}

	/**
	 * Update a cron workflow
	 * @param namespace The namespace of the cron workflow
	 * @param name The name of the cron workflow
	 * @param cronWorkflow The updated cron workflow object
	 */
	async updateCronWorkflow(
		namespace: string,
		name: string,
		cronWorkflow: ArgoCronWorkflow,
	): Promise<void> {
		const url = `/cron-workflows/${namespace}/${name}`;

		const body = {
			cronWorkflow: cronWorkflow,
		};

		await this.http.put(url, body);
	}

	/**
	 * Creates a cron workflow schedule
	 * @param cronWorkflowObject The cron workflow object to create
	 * @param namespace The namespace to create the cron workflow in
	 */
	async createSchedule(cronWorkflowObject: ArgoCronWorkflow, namespace: string): Promise<void> {
		const url = `/cron-workflows/${namespace}`;

		const body = {
			cronWorkflow: cronWorkflowObject,
		};

		await this.http.post(url, body);
	}

	/**
	 * Delete a cron workflow by namespace and name
	 * @param namespace Namespace of the cron workflow
	 * @param name Name of the cron workflow
	 */
	async deleteSchedule(namespace: string, name: string): Promise<void> {
		const url = `/cron-workflows/${namespace}/${name}`;

		await this.http.delete(url);
	}

	/**
	 * Suspend a cron workflow by namespace and name
	 * @param namespace Namespace of the cron workflow
	 * @param name Name of the cron workflow
	 */
	async suspendSchedule(namespace: string, name: string): Promise<void> {
		const url = `/cron-workflows/${namespace}/${name}/suspend`;

		await this.http.put(url);
	}

	/**
	 * Resume a cron workflow by namespace and name
	 * @param namespace Namespace of the cron workflow
	 * @param name Name of the cron workflow
	 */
	async resumeSchedule(namespace: string, name: string): Promise<void> {
		const url = `/cron-workflows/${namespace}/${name}/resume`;

		await this.http.put(url);
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
	 * Enrich a single workflow run with the crawler template name by looking up the originating cron workflow
	 * if the run originated from a cron workflow and doesn't already have the crawlerTemplateName set.
	 * @param run single workflow run to enrich
	 */
	async enrichWorkflowRunWithCronWorkflowTemplateName(run: CrawlerRunDto): Promise<CrawlerRunDto> {
		if (!run.crawlerTemplateName && run.scheduleName) {
			const schedule = await this.getScheduleByNamespaceAndName(run.namespace, run.scheduleName);
			if (schedule) {
				run.crawlerTemplateName = schedule.crawlerTemplateName;
			}
		}
		return run;
	}
}
