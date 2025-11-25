import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { EnvironmentVariables } from '../../env.validation';

@Injectable()
export class ArgoAuthService {
	private readonly saTokenPath = '/var/run/secrets/kubernetes.io/serviceaccount/token';

	constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {}

	/**
	 * Detect if running inside Kubernetes
	 */
	private isRunningInCluster(): boolean {
		return this.configService.get<string>('STAGE') !== 'local';
	}

	/**
	 * Get token from ServiceAccount (in-cluster)
	 */
	private getInClusterToken(): string {
		return fs.readFileSync(this.saTokenPath, 'utf8');
	}

	/**
	 * Get bearer token from env var
	 * @private
	 */
	private getLocalTokenFromEnv(): string {
		const kubeBearerToken = this.configService.get<string>('KUBE_BEARER_TOKEN');
		return kubeBearerToken;
	}

	/**
	 * Always return the correct token dynamically (auto-detected)
	 */
	getAuthToken(): string {
		if (this.isRunningInCluster()) {
			return this.getInClusterToken();
		}
		return this.getLocalTokenFromEnv();
	}
}
