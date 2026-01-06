import { HealthStatusEnum } from '@/src/app/api/dto/health/healthStatus.enum';
import { TargetDto } from './target.dto';

export class TargetUrlStatusDto {
	target!: TargetDto;

	status!: HealthStatusEnum;
}
