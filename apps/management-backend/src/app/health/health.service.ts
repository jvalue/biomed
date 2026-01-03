import axios from 'axios';
import { HealthCheckDto, HealthStatusEnum } from './dto/healthCheck.dto';

export class HealthService {
	async checkHealth(): Promise<HealthCheckDto> {
		const targets = [
			'https://ftp.ncbi.nlm.nih.gov/',
			'test.invalid', // invalid domain to simulate DOWN
		];

		// Run checks in parallel
		const checks = await Promise.all(
			targets.map(async (url) => ({ url, status: await this.checkServiceHealth(url) })),
		);

		const kubernetesStatus = HealthStatusEnum.AVAILABLE; // placeholder
		const orchestratorStatus = HealthStatusEnum.AVAILABLE; // placeholder

		// Determine overall status
		const overAllStatus = this.determineOverallStatus(
			kubernetesStatus,
			orchestratorStatus,
			checks.map((c) => c.status),
		);

		return {
			overAllStatus,
			kubernetesStatus,
			orchestratorStatus,
			targetUrlsStatus: checks,
		};
	}

	/**
	 * Checks the health of a given service URL.
	 * Strategy:
	 * - Perform a GET request with a short timeout
	 * - Retry a small number of times with exponential backoff for transient network errors
	 * - Map HTTP status codes to HealthStatusEnum:
	 *    1xx/2xx/3xx -> AVAILABLE
	 *    4xx          -> LIMITED (endpoint reachable, client-level error)
	 *    5xx          -> DOWN (server-side error)
	 * - Network errors / timeouts -> DOWN
	 */
	private async checkServiceHealth(url: string): Promise<HealthStatusEnum> {
		const normalizedUrl = url.includes('://') ? url : `http://${url}`;
		const timeoutMs = Number(process.env.HEALTH_CHECK_TIMEOUT_MS || 3000);
		const maxAttempts = Number(process.env.HEALTH_CHECK_RETRIES || 2);

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				const res = await axios.get(normalizedUrl, {
					timeout: timeoutMs,
				});

				// categorize by status code
				const statusCode = res.status;
				if (statusCode >= 100 && statusCode < 400) {
					return HealthStatusEnum.AVAILABLE;
				}
				if (statusCode >= 400 && statusCode < 500) {
					return HealthStatusEnum.LIMITED;
				}
				if (statusCode >= 500) {
					return HealthStatusEnum.DOWN;
				}

				// fallback
				return HealthStatusEnum.DOWN;
			} catch {
				// network error, timeout or other
				const isLast = attempt === maxAttempts;
				// If not last attempt, wait with exponential backoff
				if (!isLast) {
					const backoffMs = 100 * 2 ** (attempt - 1); // 100ms, 200ms, 400ms...
					await new Promise((r) => setTimeout(r, backoffMs));
					continue;
				}
				// Last attempt failed -> mark as DOWN
				return HealthStatusEnum.DOWN;
			}
		}

		return HealthStatusEnum.DOWN;
	}

	/**
	 * Determines the overall health status based on individual component statuses. if Kubernetes or Orchestrator is DOWN, overall is DOWN.
	 * If Kubernetes or Orchestrator is LIMITED, overall is LIMITED unless any target URL is DOWN.
	 * If any target Urls are down or limited overall is limited
	 * @param kubernetesStatus
	 * @param orchestratorStatus
	 * @param targetUrlsStatus
	 * @private
	 */
	private determineOverallStatus(
		kubernetesStatus: HealthStatusEnum,
		orchestratorStatus: HealthStatusEnum,
		targetUrlsStatus: HealthStatusEnum[],
	): HealthStatusEnum {
		if (
			kubernetesStatus === HealthStatusEnum.DOWN ||
			orchestratorStatus === HealthStatusEnum.DOWN
		) {
			return HealthStatusEnum.DOWN;
		}
		if (
			kubernetesStatus === HealthStatusEnum.LIMITED ||
			orchestratorStatus === HealthStatusEnum.LIMITED
		) {
			return HealthStatusEnum.LIMITED;
		}
		if (targetUrlsStatus.includes(HealthStatusEnum.DOWN || HealthStatusEnum.LIMITED)) {
			return HealthStatusEnum.LIMITED;
		}
		return HealthStatusEnum.AVAILABLE;
	}
}
