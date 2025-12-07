import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { EnvironmentVariables } from '../../env.validation';

/**
 * Service to provide authentication token for Argo Client
 */
@Injectable()
export class ArgoAuthService {
	private readonly logger = new Logger(ArgoAuthService.name);
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
		try {
			return fs.readFileSync(this.saTokenPath, 'utf8');
		} catch (err) {
			throw new Error(
				`Failed to read service account token from ${this.saTokenPath}: ${err.message}`,
			);
		}
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
			this.logger.log('Running in cluster, using in-cluster token');
			return this.getInClusterToken();
		}
		this.logger.log('Running locally, using token from env var');
		return this.getLocalTokenFromEnv();
	}
}
