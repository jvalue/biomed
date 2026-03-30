import { useTargetUrlsHealthCheck } from '@/src/app/api/hooks/useHealthCheck';
import { useSchedules } from '@/src/app/api/hooks/useSchedules';
import { Spinner } from '@/src/app/components/design-components/spinner';
import SchedulesTable from '@/src/app/components/schedules/schedules-table';
import { useAuth } from '@/src/app/contexts/AuthContext';

export default function SchedulesList() {
	const { ability } = useAuth();
	const { data, isLoading, error } = useSchedules();
	const { data: targetHealth, error: targetsError } = useTargetUrlsHealthCheck(
		ability.can('read', 'health'),
	);

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
			<SchedulesTable schedules={data} targetHealth={targetsError ? undefined : targetHealth} />
		</div>
	);
}
