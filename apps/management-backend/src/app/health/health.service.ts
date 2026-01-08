import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ArgoClientService } from '../argo-client/argo-client.service';
import { AbilityFactory } from '../auth/ability-factory';
import { KubernetesClientService } from '../kubernetes-client/kubernetes-client.service';
import { UserEntity } from '../users/entity/user.entity';
import { SystemHealthDto } from './dto/systemHealth.dto';
import { TargetUrlStatusDto } from './dto/targetUrlStatus.dto';
import { HealthStatusEnum } from './enum/healthStatus.enum';
import { TargetsService } from './targets/targets.service';

@Injectable()
export class HealthService {
	constructor(
		private readonly argoClientService: ArgoClientService,
		private readonly kubernetesClientService: KubernetesClientService,
		private readonly targetsService: TargetsService,
		private readonly abilityFactory: AbilityFactory,
	) {}

	async getTargetsHealth(user: UserEntity): Promise<TargetUrlStatusDto[]> {
		const targets = await this.targetsService.findAllActiveTargets();

		// Run checks in parallel
		const checks = await Promise.all(
			targets.map(async (target) => {
				const status = await this.checkServiceHealth(target.url);
				const dto = new TargetUrlStatusDto();
				dto.target = target;
				dto.status = status;
				return dto;
			}),
		);

		// Check if user has permissions to see schedules
		const ability = this.abilityFactory.defineAbilityFor(user);
		if (ability.cannot('read', 'schedule')) {
			checks.forEach((check) => {
				check.target.schedules = undefined;
			});
		}

		return checks;
	}

	async getSystemHealth(): Promise<SystemHealthDto> {
		const kubernetesStatus = await this.kubernetesClientService.checkHealth();
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
		// Normalize URL to ensure it has a scheme
		const normalizedUrl = url.includes('://') ? url : `http://${url}`;
		const timeoutMs = 3000;
		const maxAttempts = 2;

		// Validate URL format
		try {
			new URL(normalizedUrl);
		} catch {
			return HealthStatusEnum.DOWN;
		}

		// Attempt requests with retries
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
