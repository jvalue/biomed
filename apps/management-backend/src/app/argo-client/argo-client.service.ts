import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { EnvironmentVariables } from '../env.validation';
import { ArgoAuthService } from './argo-auth/argo-auth.service';
import { WorkflowRunDto } from './dto/workflow-run.dto';

/**
 * Service to interact with Argo Workflows API
 */
@Injectable()
export class ArgoClientService {
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
	 * List all current workflows in a namespace
	 * @param namespace
	 */
	async listWorkflows(namespace: string): Promise<WorkflowRunDto[]> {
		if (!/^[\w-]+$/.test(namespace)) {
			throw new Error(
				'Invalid namespace: only alphanumeric characters, hyphens, and underscores are allowed.',
			);
		}
		const res = await this.http.get(`/workflows/${namespace}`);
		return res.data;
	}
}
