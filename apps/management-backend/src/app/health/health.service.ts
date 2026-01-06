import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ArgoClientService } from '../argo-client/argo-client.service';
import { SystemHealthDto } from './dto/systemHealth.dto';
import { TargetUrlStatusDto } from './dto/targetUrlStatus.dto';
import { HealthStatusEnum } from './enum/healthStatus.enum';
import { TargetsService } from './targets/targets.service';

@Injectable()
export class HealthService {
	constructor(
		private readonly argoClientService: ArgoClientService,
		private readonly targetsService: TargetsService,
	) {}

	async getTargetsHealth(): Promise<TargetUrlStatusDto[]> {
		const targets = await this.targetsService.findAllTargets();

		// Run checks in parallel
		const checks: TargetUrlStatusDto[] = await Promise.all(
			targets.map(async (target) => {
				const status = await this.checkServiceHealth(target.url);
				return {
					url: target.url,
					status,
				};
			}),
		);

		return checks;
	}

	async getSystemHealth(): Promise<SystemHealthDto> {
		const kubernetesStatus = HealthStatusEnum.AVAILABLE; // placeholder
		const orchestratorStatus = await this.argoClientService.checkHealth();

		return {
			kubernetesStatus,
			orchestratorStatus,
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
		const timeoutMs = Number(3000);
		const maxAttempts = Number(2);

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
}
