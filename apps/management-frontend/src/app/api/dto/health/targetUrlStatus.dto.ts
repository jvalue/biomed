import { HealthStatusEnum } from '@/src/app/api/dto/health/healthStatus.enum';

export class TargetUrlStatusDto {
	url!: string;

	status!: HealthStatusEnum;
}
