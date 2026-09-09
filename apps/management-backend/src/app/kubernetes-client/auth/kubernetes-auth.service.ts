import { CoreV1Api, KubeConfig } from '@kubernetes/client-node';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../env.validation';

@Injectable()
export class KubernetesAuthService {
	private readonly logger = new Logger(KubernetesAuthService.name);

	constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {}

	/**
	 * Detect if running inside Kubernetes
	 */
	private isRunningInCluster(): boolean {
		return this.configService.get<string>('STAGE') !== 'local';
	}

	/**
	 * Gets loaded KubeConfig
	 */
	getKubeConfig(): KubeConfig {
		const kubeConfig = this.isRunningInCluster()
			? this.getKubeconfigFromCluster()
			: this.getKubeconfigFromFile();

		// Test cluster validity
		const cluster = kubeConfig.getCurrentCluster();
		if (!cluster?.server) {
			this.logger.error('Loaded Kubernetes configuration is invalid (missing server URL).');
			throw new Error('Loaded Kubernetes configuration is invalid (missing server URL).');
		}
		return kubeConfig;
	}

	/**
	 * Gets Kubernetes CoreV1 API Client
	 */
	getApiClient(): CoreV1Api {
		return this.getKubeConfig().makeApiClient(CoreV1Api);
	}

	/**
	 * Gets Kubernetes AppsV1 API Client
	 */
	getAppsApiClient(): import('@kubernetes/client-node').AppsV1Api {
		const { AppsV1Api } = require('@kubernetes/client-node');
		return this.getKubeConfig().makeApiClient(AppsV1Api);
	}

	/**
	 * Get Kubeconfig from cluster (in-cluster)
	 */
	private getKubeconfigFromCluster(): KubeConfig {
		const kubeConfig = new KubeConfig();
		kubeConfig.loadFromCluster();
		this.logger.log('Loaded Kubernetes config from cluster');
		return kubeConfig;
	}

	/**
	 * Get Kubeconfig from file or default location
	 */
	private getKubeconfigFromFile(): KubeConfig {
		const kubeConfig = new KubeConfig();
		const kubeConfigPath = this.configService.get<string>('KUBE_CONFIG_PATH');
		if (kubeConfigPath) {
			kubeConfig.loadFromFile(kubeConfigPath);
			this.logger.log(`Loaded Kubernetes config from file: ${kubeConfigPath}`);
		} else {
			// Fallback to default location ($HOME/.kube/config)
			kubeConfig.loadFromDefault();
			this.logger.log('Loaded Kubernetes config from default location');
		}
		return kubeConfig;
	}
}
