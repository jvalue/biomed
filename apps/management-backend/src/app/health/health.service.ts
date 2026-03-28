import { ForbiddenException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { AbilityFactory } from '../auth/ability-factory';
import { KubernetesClientService } from '../kubernetes-client/kubernetes-client.service';
import { ArgoClientService } from '../orchestrator-client/argo-client/argo-client.service';
import { UserEntity } from '../users/entity/user.entity';
import { SystemHealthDto } from './dto/systemHealth.dto';
import { TargetUrlStatusDto } from './dto/targetUrlStatus.dto';
import { HealthStatusEnum } from './enum/healthStatus.enum';
import { TargetsService } from './targets/targets.service';

@Injectable()
export class HealthService {
	private readonly SYSTEM_HEALTH_TTL_MS = 60_000;
	private readonly TARGETS_HEALTH_TTL_MS = 5 * 60_000;

	private systemHealthCache: { value: SystemHealthDto; expiresAt: number } | null = null;
	private targetsHealthCache: { value: TargetUrlStatusDto[]; expiresAt: number } | null = null;

	private systemHealthInFlight: Promise<SystemHealthDto> | null = null;
	private targetsHealthInFlight: Promise<TargetUrlStatusDto[]> | null = null;

	constructor(
		private readonly orchestratorClientService: ArgoClientService,
		private readonly kubernetesClientService: KubernetesClientService,
		private readonly targetsService: TargetsService,
		private readonly abilityFactory: AbilityFactory,
	) {}

	async getTargetsHealth(user: UserEntity): Promise<TargetUrlStatusDto[]> {
		const now = Date.now();

		let checks: TargetUrlStatusDto[];

		if (this.targetsHealthCache && this.targetsHealthCache.expiresAt > now) {
			checks = this.cloneTargetHealthDtos(this.targetsHealthCache.value);
		} else {
			if (!this.targetsHealthInFlight) {
				this.targetsHealthInFlight = (async () => {
					const targets = await this.targetsService.findAllActiveTargets();

					// Run checks in parallel
					const result = await Promise.all(
						targets.map(async (target) => {
							const status = await this.checkServiceHealth(target.url);
							const dto = new TargetUrlStatusDto();
							dto.target = target;
							dto.status = status;
							return dto;
						}),
					);

					this.targetsHealthCache = {
						value: this.cloneTargetHealthDtos(result),
						expiresAt: Date.now() + this.TARGETS_HEALTH_TTL_MS,
					};

					return this.cloneTargetHealthDtos(result);
				})();
			}

			try {
				checks = await this.targetsHealthInFlight;
			} finally {
				this.targetsHealthInFlight = null;
			}
		}

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
		const now = Date.now();

		if (this.systemHealthCache && this.systemHealthCache.expiresAt > now) {
			return { ...this.systemHealthCache.value };
		}

		if (!this.systemHealthInFlight) {
			this.systemHealthInFlight = (async () => {
				const kubernetesStatus = await this.kubernetesClientService.checkHealth();
				const orchestratorStatus = await this.orchestratorClientService.checkHealth();

				const value: SystemHealthDto = {
					kubernetesStatus,
					orchestratorStatus,
				};

				this.systemHealthCache = {
					value,
					expiresAt: Date.now() + this.SYSTEM_HEALTH_TTL_MS,
				};

				return { ...value };
			})();
		}

		try {
			return await this.systemHealthInFlight;
		} finally {
			this.systemHealthInFlight = null;
		}
	}

	private cloneTargetHealthDtos(items: TargetUrlStatusDto[]): TargetUrlStatusDto[] {
		return items.map((item) =>
			Object.assign(new TargetUrlStatusDto(), item, {
				target: { ...item.target },
			}),
		);
	}

	async getTargetsHealthForSchedule(
		namespace: string,
		name: string,
		user: UserEntity,
	): Promise<TargetUrlStatusDto[]> {
		const ability = this.abilityFactory.defineAbilityFor(user);

		if (ability.cannot('read', 'schedule')) {
			throw new ForbiddenException('Missing permission to read schedules');
		}

		const now = Date.now();

		// Reuse fresh global cache if available
		if (this.targetsHealthCache && this.targetsHealthCache.expiresAt > now) {
			return this.cloneTargetHealthDtos(
				this.targetsHealthCache.value.filter(
					(check) =>
						check.status !== HealthStatusEnum.AVAILABLE &&
						check.target.schedules?.some(
							(schedule) => schedule.namespace === namespace && schedule.name === name,
						),
				),
			);
		}

		// Otherwise only load targets for the requested schedule
		const targets = await this.targetsService.findTargetsBySchedule(namespace, name);

		const checks = await Promise.all(
			targets.map(async (target) => {
				const status = await this.checkServiceHealth(target.url);
				const dto = new TargetUrlStatusDto();
				dto.target = target;
				dto.status = status;
				return dto;
			}),
		);

		return checks.filter((check) => check.status !== HealthStatusEnum.AVAILABLE);
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
