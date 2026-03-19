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
				this.logger.error('Kubernetes health check: no nodes returned from API');
				return HealthStatusEnum.DOWN;
			}

			// Collect nodes that are not ready or have pressure conditions
			const badNodes: { name: string; reasons: string[] }[] = [];
			for (const node of nodes) {
				const name = node.metadata?.name ?? 'N/A';
				const conditions = node.status?.conditions ?? [];

				const readyCond = conditions.find((c) => c.type === 'Ready');
				const isReady = readyCond?.status === 'True';

				const pressures = conditions
					.filter(
						(c) =>
							['MemoryPressure', 'DiskPressure', 'PIDPressure'].includes(c.type) &&
							c.status === 'True',
					)
					.map((c) => c.type);

				const reasons: string[] = [];
				if (!isReady) {
					const readyStatus = readyCond?.status ?? 'Unknown';
					const readyReason = readyCond?.reason ? ` reason=${readyCond.reason}` : '';
					reasons.push(`Ready=${readyStatus}${readyReason}`);
				}
				if (pressures.length) {
					reasons.push(`Pressure=${pressures.join(',')}`);
				}

				if (reasons.length) {
					badNodes.push({ name, reasons });
				}
			}

			if (badNodes.length) {
				this.logger.warn(
					`Cluster Health: ${badNodes.length} node(s) not healthy. Details: ${badNodes
						.map((n) => `${n.name} (${n.reasons.join(';')})`)
						.join(', ')}`,
				);
				return HealthStatusEnum.LIMITED;
			}

			// 2. Check System Pods (kube-system)
			// Check the 'crawler-management' namespace
			const podsRes = await this.coreV1.listNamespacedPod({ namespace: 'crawler-management' });
			const systemPods = podsRes.items ?? [];

			// Check the argo namespace
			const argoPodsRes = await this.coreV1.listNamespacedPod({ namespace: 'argo' });
			systemPods.push(...(argoPodsRes.items ?? []));

			const unhealthyPods: {
				namespace: string;
				name: string;
				phase: string;
				conditions: string[];
				containerStatuses: string[];
			}[] = [];

			for (const pod of systemPods) {
				// Ignore completed pods
				if (pod.status?.phase === 'Succeeded' || pod.status?.phase === 'Failed') {
					continue;
				}

				const isReady = pod.status?.conditions?.find((c) => c.type === 'Ready')?.status === 'True';
				if (!isReady) {
					const ns = pod.metadata?.namespace ?? 'N/A';
					const name = pod.metadata?.name ?? 'N/A';
					const phase = pod.status?.phase ?? 'N/A';
					const conds =
						pod.status?.conditions?.map((c) => {
							const reasonPart = c.reason ? ' reason=' + c.reason : '';
							return c.type + '=' + c.status + reasonPart;
						}) ?? [];
					const containerStatuses =
						pod.status?.containerStatuses?.map((cs) => {
							const waitingPart = cs.state?.waiting?.reason
								? ' waiting=' + cs.state.waiting.reason
								: '';
							const terminatedPart = cs.state?.terminated?.reason
								? ' terminated=' + cs.state.terminated.reason
								: '';
							return `${cs.name}:${cs.ready ? 'ready' : 'not-ready'}${waitingPart}${terminatedPart}`;
						}) ?? [];

					unhealthyPods.push({ namespace: ns, name, phase, conditions: conds, containerStatuses });
				}
			}

			if (unhealthyPods.length) {
				this.logger.warn(
					`Cluster Health: ${unhealthyPods.length} system pod(s) not ready. Examples: ${unhealthyPods
						.slice(0, 5)
						.map(
							(p) =>
								`${p.namespace}/${p.name} phase=${p.phase} conditions=[${p.conditions.join(', ')}] containers=[${p.containerStatuses.join(', ')}]`,
						)
						.join('; ')}`,
				);
				return HealthStatusEnum.LIMITED;
			}

			return HealthStatusEnum.AVAILABLE;
		} catch (err) {
			this.logger.error(
				`Kubernetes health check failed: ${err?.message ?? String(err)}`,
				(typeof err === 'object' && (err as Error).stack) || String(err),
			);
			return HealthStatusEnum.DOWN;
		}
	}
}
