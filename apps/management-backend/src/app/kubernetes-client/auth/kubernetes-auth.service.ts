import { CoreV1Api, KubeConfig } from '@kubernetes/client-node';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KubernetesAuthService {
	private readonly logger = new Logger(KubernetesAuthService.name);

	constructor(private readonly configService: ConfigService) {}

	/**
	 * Gets Kubernetes API Client
	 */
	getApiClient(): CoreV1Api {
		let kubeConfig: KubeConfig | null = this.getKubeconfigFromCluster();
		if (!kubeConfig) {
			const kubeConfigPath = this.configService.get<string>('KUBE_CONFIG_PATH');
			kubeConfig = this.getKubeconfigFromFile(kubeConfigPath);
		}
		if (!kubeConfig) {
			this.logger.error('Unable to load Kubernetes configuration from both cluster and file.');
			throw new Error('Failed to load Kubernetes configuration from both cluster and file.');
		}

		// Test cluster validity
		const cluster = kubeConfig.getCurrentCluster();
		if (!cluster?.server) {
			this.logger.error('Loaded Kubernetes configuration is invalid (missing server URL).');
			throw new Error('Loaded Kubernetes configuration is invalid (missing server URL).');
		}
		return kubeConfig.makeApiClient(CoreV1Api);
	}

	/**
	 * Get Kubeconfig from cluster
	 */
	private getKubeconfigFromCluster(): KubeConfig | null {
		const kubeConfig = new KubeConfig();
		try {
			kubeConfig.loadFromCluster();
			// Check if the loaded config is valid
			const cluster = kubeConfig.getCurrentCluster();
			if (!cluster?.server || cluster.server.includes('undefined')) {
				throw new Error('In-cluster config loaded but invalid (server URL undefined).');
			}
		} catch (err) {
			this.logger.warn(`Failed to load in-cluster config: ${err.message}`);
			return null;
		}
		this.logger.log('Loaded Kubernetes config from cluster');
		return kubeConfig;
	}

	/**
	 * Get Kubeconfig from file
	 * @param kubeConfigPath
	 */
	private getKubeconfigFromFile(kubeConfigPath: string): KubeConfig | null {
		const kubeConfig = new KubeConfig();
		try {
			if (kubeConfigPath) {
				kubeConfig.loadFromFile(kubeConfigPath);
				this.logger.log(`Loaded Kubernetes config from file: ${kubeConfigPath}`);
			} else {
				// Fallback to default location ($HOME/.kube/config)
				kubeConfig.loadFromDefault();
				this.logger.log('Loaded Kubernetes config from default location');
			}
		} catch (err) {
			this.logger.error(`Failed to load Kubernetes config from file: ${err.message}`);
			return null;
		}
		return kubeConfig;
	}
}
