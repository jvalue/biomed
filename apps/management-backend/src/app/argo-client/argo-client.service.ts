import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { EnvironmentVariables } from '../env.validation';
import { CursorBasedPaginationRequestDto } from '../pagination/dto/cursor-based-pagination-request.dto';
import { CursorBasedPaginationResponseDto } from '../pagination/dto/cursor-based-pagination-response.dto';
import { WorkflowRunDto } from '../workflow-runs/dto/workflow-run.dto';
import { WorkflowRunFilterDto } from '../workflow-runs/dto/workflow-run-filter.dto';
import { WorkflowTemplateDto } from '../workflow-templates/dto/workflow-template.dto';
import { WorkflowTemplatesFilterDto } from '../workflow-templates/dto/workflow-templates-filter.dto';
import { ArgoAuthService } from './argo-auth/argo-auth.service';
import { ArgoCursorPaginatedListDto } from './dto/argo-cursor-paginated-list-dto';
import { ArgoWorkflowRunDto } from './dto/workflow-runs/argo-workflow-run.dto';
import { ArgoWorkflowTemplateDto } from './dto/workflow-templates/argo-workflow-template.dto';
import {
	mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto,
	mapArgoWorkflowRunDtoToWorkflowRunDto,
	mapArgoWorkflowTemplateDtoToWorkflowTemplateDto,
} from './mapper/argo.mapper';
import { ArgoQueryParamBuilder } from './utils/argo-query-param-builder';

/**
 * Service to interact with Argo Workflows API
 */
@Injectable()
export class ArgoClientService {
	private readonly logger = new Logger(ArgoClientService.name);
	private readonly http: AxiosInstance;

	constructor(
		argoAuthService: ArgoAuthService,
		configService: ConfigService<EnvironmentVariables, true>,
	) {
		const argoBaseUrl = configService.get<string>('ARGO_BASE_URL');
		const token = 'Bearer ' + argoAuthService.getAuthToken();
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
	 * List all current workflows in all namespaces
	 * @param filterOptions Filtering options
	 * @param paginationOptions Options for cursor-based pagination
	 */
	async listWorkflows(
		filterOptions?: WorkflowRunFilterDto,
		paginationOptions?: CursorBasedPaginationRequestDto,
	): Promise<CursorBasedPaginationResponseDto<WorkflowRunDto>> {
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
			filterOptions?.workflowTemplateName,
		);
		argoQueryParamBuilder.addLabelSelector('workflows.argoproj.io/phase', filterOptions?.phases);

		// Normal query parameters
		argoQueryParamBuilder.add('createdAfter', filterOptions?.createdAfter?.toISOString());
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

		// Map ArgoCursorPaginatedListDto<ArgoWorkflowRunDto> to CursorBasedPaginationResponseDto<WorkflowRunDto>
		return mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto(
			workflowsResponse,
			mapArgoWorkflowRunDtoToWorkflowRunDto,
		);
	}

	async listWorkflowTemplates(
		filterOptions?: WorkflowTemplatesFilterDto,
	): Promise<WorkflowTemplateDto[]> {
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

		// Map ArgoWorkflowTemplateDto[] to WorkflowTemplateDto[] as we do not offer pagination here
		return templatesResponse?.map(mapArgoWorkflowTemplateDtoToWorkflowTemplateDto) ?? [];
	}
}
