import { CoreV1Api } from '@kubernetes/client-node';
import { Injectable, Logger } from '@nestjs/common';
import { HealthStatusEnum } from '../health/enum/healthStatus.enum';
import { KubernetesAuthService } from './auth/kubernetes-auth.service';

@Injectable()
export class KubernetesClientService {
	private readonly logger = new Logger(KubernetesClientService.name);
	private readonly coreV1: CoreV1Api;

	constructor(kubernetesAuthService: KubernetesAuthService) {
		// Get Kubernetes API Client from Auth Service
		this.coreV1 = kubernetesAuthService.getApiClient();
	}

	/**
	 * Checks the health of the Kubernetes cluster.
	 * Strategy:
	 * 1. Check Nodes: Ensure all nodes are ready and not under resource pressure.
	 * 2. Check System Pods: Ensure critical system pods (in 'crawler-management' and 'argo' namespaces) are running and ready.
	 *
	 * Returns:
	 * - HealthStatusEnum.AVAILABLE: All checks passed.
	 * - HealthStatusEnum.LIMITED: Some nodes or system pods are unhealthy.
	 * - HealthStatusEnum.DOWN: Unable to connect to cluster or no nodes found.
	 */
	async checkHealth(): Promise<HealthStatusEnum> {
		try {
			// 1. Check Nodes & Pressure
			const nodeRes = await this.coreV1.listNode();
			const nodes = nodeRes.items ?? [];

			if (nodes.length === 0) {
				return HealthStatusEnum.DOWN;
			}

			const nodeHealthIssue = nodes.some((node) => {
				const conditions = node.status?.conditions ?? [];

				// Check 1: Is Node Ready?
				const isReady = conditions.find((c) => c.type === 'Ready')?.status === 'True';

				// Check 2: Do we have Resource Pressure? (Status 'True' means pressure exists -> bad)
				const hasPressure = conditions.some(
					(c) =>
						['MemoryPressure', 'DiskPressure', 'PIDPressure'].includes(c.type) &&
						c.status === 'True',
				);

				return !isReady || hasPressure;
			});

			if (nodeHealthIssue) {
				this.logger.warn('Cluster Health: Nodes are not ready or under pressure.');
				return HealthStatusEnum.LIMITED;
			}

			// 2. Check System Pods (kube-system)
			// Check the 'crawler-management' namespace
			const podsRes = await this.coreV1.listNamespacedPod({ namespace: 'crawler-management' });
			const systemPods = podsRes.items ?? [];

			// Check the argo namespace
			const argoPodsRes = await this.coreV1.listNamespacedPod({ namespace: 'argo' });
			systemPods.push(...(argoPodsRes.items ?? []));

			const systemPodIssue = systemPods.some((pod) => {
				// Ignore completed pods
				if (pod.status?.phase === 'Succeeded' || pod.status?.phase === 'Failed') {
					return false;
				}

				// Check if Pod is Ready
				const isReady = pod.status?.conditions?.find((c) => c.type === 'Ready')?.status === 'True';
				return !isReady;
			});

			if (systemPodIssue) {
				this.logger.warn('Cluster Health: Some kube-system pods are unhealthy.');
				return HealthStatusEnum.LIMITED;
			}

			return HealthStatusEnum.AVAILABLE;
		} catch (err) {
			this.logger.error('Kubernetes health check failed: ', err);
			return HealthStatusEnum.DOWN;
		}
	}
}
