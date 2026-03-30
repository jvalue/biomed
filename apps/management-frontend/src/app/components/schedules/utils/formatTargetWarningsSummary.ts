import { HealthStatusEnum } from '@/src/app/api/dto/health/healthStatus.enum';
import { TargetUrlStatusDto } from '@/src/app/api/dto/health/targets/targetUrlStatus.dto';

export function formatTargetWarningsSummary(targetWarnings: TargetUrlStatusDto[]): string {
	const numberDown = targetWarnings.filter(
		(warning) => warning.status === HealthStatusEnum.DOWN,
	).length;
	const numberLimited = targetWarnings.filter(
		(warning) => warning.status === HealthStatusEnum.LIMITED,
	).length;

	const parts: string[] = [];

	if (numberDown > 0) {
		parts.push(`${numberDown} target${numberDown === 1 ? '' : 's'} down`);
	}

	if (numberLimited > 0) {
		parts.push(`${numberLimited} target${numberLimited === 1 ? '' : 's'} limited`);
	}

	return parts.join(', ');
}
