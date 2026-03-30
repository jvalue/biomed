import { HealthStatusEnum } from '@/src/app/api/dto/health/healthStatus.enum';
import { useTargetUrlsHealthCheck } from '@/src/app/api/hooks/useHealthCheck';
import { useSchedules } from '@/src/app/api/hooks/useSchedules';
import { Spinner } from '@/src/app/components/design-components/spinner';
import SchedulesTable from '@/src/app/components/schedules/schedules-table';

export default function SchedulesList() {
	const { data, isLoading, error } = useSchedules();
	const { error: targetsError } = useTargetUrlsHealthCheck();

	const mockedTargetHealth = [
		{
			status: HealthStatusEnum.DOWN,
			target: {
				id: 'target-1',
				displayName: 'Example API',
				url: 'https://example-api.internal',
				schedules: [
					{
						namespace: 'argo-managed-crawler',
						name: 'europe-central',
					},
				],
			},
		},
		{
			status: HealthStatusEnum.DOWN,
			target: {
				id: 'target-2',
				displayName: 'Example API',
				url: 'https://example-api.internal',
				schedules: [
					{
						namespace: 'argo-managed-crawler',
						name: 'test-schedule',
					},
				],
			},
		},
	];

	if (isLoading) {
		return (
			<div className="col-span-12 flex justify-center pt-6">
				<Spinner className="size-10" />
			</div>
		);
	}

	if (error) return <div>An error occurred: {error.message}</div>;

	return (
		<div>
			<p>
				In the following table you can see all schedules. You can see the details of a schedule by
				clicking on it.
			</p>
			<SchedulesTable
				schedules={data}
				targetHealth={targetsError ? undefined : mockedTargetHealth}
			/>
		</div>
	);
}
