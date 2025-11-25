import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { EnvironmentVariables } from '../env.validation';
import { ArgoAuthService } from './argo-auth/argo-auth.service';
import { WorkflowRunDto } from './dto/workflow-run.dto';

@Injectable()
export class ArgoClientService {
	private readonly http: AxiosInstance;

	constructor(
		private readonly argoAuthService: ArgoAuthService,
		private readonly configService: ConfigService<EnvironmentVariables, true>,
	) {
		const argoBaseUrl = this.configService.get<string>('ARGO_BASE_URL');
		const token = argoAuthService.getAuthToken();
		this.http = axios.create({
			baseURL: argoBaseUrl,
			timeout: 10000,
			headers: {
				Authorization: token ? `${token}` : undefined,
				Accept: 'application/json',
			},
		});
	}

	async listWorkflows(namespace: string): Promise<WorkflowRunDto[]> {
		const res = await this.http.get(`/workflows/${namespace}`);
		return res.data;
	}
}
