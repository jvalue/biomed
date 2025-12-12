import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { EnvironmentVariables } from '../env.validation';
import { CurserBasedPaginationResponseDto } from '../pagination/dto/curser-based-pagination-response.dto';
import { CurserBasedPaginationRequestDto } from '../pagination/dto/cursor-based-pagination-request.dto';
import { WorkflowRunDto } from '../workflow-runs/dto/workflow-run.dto';
import { WorkflowRunFilterDto } from '../workflow-runs/dto/workflow-run-filter.dto';
import { ArgoAuthService } from './argo-auth/argo-auth.service';
import { ArgoCursorPaginatedListDto } from './dto/argo-cursor-paginated-list-dto';
import { ArgoWorkflowRunDto } from './dto/workflow-runs/argo-workflow-run.dto';
import { WorkflowPhaseEnum } from './enums/workflow-phase.enum';
import {
	mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto,
	mapArgoWorkflowRunDtoToWorkflowRunDto,
} from './mapper/argo.mapper';

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
	 */
	async listWorkflows(
		filterOptions?: WorkflowRunFilterDto,
		paginationOptions?: CurserBasedPaginationRequestDto,
	): Promise<CurserBasedPaginationResponseDto<WorkflowRunDto>> {
		this.logger.log('Listing workflows from Argo Workflows API');
		const queryParams = this.assembleListWorkflowsQueryParams(
			filterOptions?.workflowTemplateName,
			filterOptions?.phases,
			filterOptions?.createdAfter?.toISOString(),
			filterOptions?.finishedBefore?.toISOString(),
			paginationOptions?.limit,
			paginationOptions?.offset,
		);

		let url = filterOptions?.namespace ? `/workflows/${filterOptions.namespace}` : `/workflows/`;
		if (queryParams) {
			url += `${queryParams}`;
		}
		this.logger.debug('Constructed URL for listing workflows:', url);

		const res = await this.http.get(url);
		const workflowsResponse: ArgoCursorPaginatedListDto<ArgoWorkflowRunDto> = res.data;

		this.logger.debug('Argo Workflows API response:', workflowsResponse);

		// Map ArgoCursorPaginatedListDto<ArgoWorkflowRunDto> to CurserBasedPaginationResponseDto<WorkflowRunDto>
		return mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto(
			workflowsResponse,
			mapArgoWorkflowRunDtoToWorkflowRunDto,
		);
	}

	/**
	 * Assemble query parameters for listing workflows
	 * @param template
	 * @param phases
	 * @param startedAfter
	 * @param finishedBefore
	 * @param limit max number of items to return
	 * @param offset number of items to skip
	 * @private
	 */
	private assembleListWorkflowsQueryParams(
		template?: string,
		phases?: WorkflowPhaseEnum[],
		startedAfter?: string,
		finishedBefore?: string,
		limit?: number,
		offset?: number,
	): string {
		let paramsString = '';

		if (template) {
			paramsString += `?listOptions.labelSelector=workflows.argoproj.io/workflow-template=${template}`;
		}

		if (phases && phases.length > 0) {
			const phasesParam = phases.map((phase) => `${phase}`).join(',');
			paramsString += paramsString
				? `, workflows.argoproj.io/phase in (${phasesParam})`
				: `?listOptions.labelSelector=workflows.argoproj.io/phase in (${phasesParam})`;
		}

		if (startedAfter) {
			paramsString += paramsString
				? `&createdAfter=${startedAfter}`
				: `?createdAfter=${startedAfter}`;
		}

		if (finishedBefore) {
			paramsString += paramsString
				? `&finishedBefore=${finishedBefore}`
				: `?finishedBefore=${finishedBefore}`;
		}

		if (limit) {
			paramsString += paramsString ? `&listOptions.limit=${limit}` : `?listOptions.limit=${limit}`;
		}

		if (offset) {
			paramsString += paramsString
				? `&listOptions.continue=${offset}`
				: `?listOptions.continue=${offset}`;
		}

		return paramsString;
	}
}
