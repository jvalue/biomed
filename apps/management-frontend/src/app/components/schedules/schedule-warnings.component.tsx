import { AlertTriangle } from 'lucide-react';
import { HealthStatusEnum } from '@/src/app/api/dto/health/healthStatus.enum';
import { TargetUrlStatusDto } from '@/src/app/api/dto/health/targets/targetUrlStatus.dto';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/src/app/components/design-components/card';

interface ScheduleWarningsComponentProps {
	targetWarnings?: TargetUrlStatusDto[];
}

function formatWarningsSummary(targetWarnings: TargetUrlStatusDto[]): string {
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

export default function ScheduleWarningsComponent({
	targetWarnings = [],
}: ScheduleWarningsComponentProps) {
	if (targetWarnings.length === 0) {
		return null;
	}

	return (
		<Card className="border-yellow-300 bg-yellow-50 shadow-sm">
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-yellow-800">
					<AlertTriangle className="h-5 w-5" />
					Target warnings
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<p className="text-sm text-yellow-900">{formatWarningsSummary(targetWarnings)}</p>

				<div className="space-y-2">
					{targetWarnings.map((warning) => (
						<div
							key={warning.target.id}
							className="flex items-center justify-between rounded-md border bg-white px-3 py-2"
						>
							<div className="min-w-0">
								<p className="font-medium">{warning.target.displayName}</p>
								<p className="text-sm text-muted-foreground truncate">{warning.target.url}</p>
							</div>

							<span
								className={
									warning.status === HealthStatusEnum.DOWN
										? 'text-sm font-medium text-red-600'
										: 'text-sm font-medium text-yellow-700'
								}
							>
								{warning.status}
							</span>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
