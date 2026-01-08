import { HealthStatusEnum } from '@/src/app/api/dto/health/healthStatus.enum';

export class SystemHealthStatusDto {
	kubernetesStatus!: HealthStatusEnum;
	orchestratorStatus!: HealthStatusEnum;
}
