import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { EnvironmentVariables } from '../env.validation';
import { WorkflowRunDto } from '../workflow-runs/dto/workflow-run.dto';
import { ArgoAuthService } from './argo-auth/argo-auth.service';
import { ArgoWorkflowRunListDto } from './dto/workflow-runs/argo-workflow-run-list.dto';

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
	 */
	async listWorkflows(): Promise<WorkflowRunDto[]> {
		this.logger.log('Listing workflows from Argo Workflows API');
		const res = await this.http.get(`/workflows/`);
		const workflowsResponse: ArgoWorkflowRunListDto = res.data;

		this.logger.debug('Argo Workflows API response:', workflowsResponse);
		// Map ArgoWorkflowRunListDto to WorkflowRunDto
		const workflowRuns: WorkflowRunDto[] =
			workflowsResponse.items?.map((item) => {
				const workflowRun = new WorkflowRunDto();
				workflowRun.name = item.metadata.name;
				workflowRun.namespace = item.metadata.namespace;
				workflowRun.workflowTemplateName = item.spec.workflowTemplateRef.name;
				workflowRun.phase = item.status.phase;
				workflowRun.startedAt = item.status.startedAt;
				workflowRun.finishedAt = item.status.finishedAt;
				return workflowRun;
			}) ?? [];
		return workflowRuns;
	}
}
