import { createFileRoute } from '@tanstack/react-router';
import SchedulesList from '@/src/app/components/schedules/schedules-list';
import { useAuth } from '@/src/app/contexts/AuthContext';
import { AuthGuard } from '../components/guards/auth-guard';
import { PermissionGuard } from '../components/guards/permission-guard';

export const Route = createFileRoute('/schedules')({
	component: RouteComponent,
});

function RouteComponent() {
	const { ability } = useAuth();
	return (
		<AuthGuard>
			<PermissionGuard
				ability={ability}
				required={[
					{
						action: 'read',
						subject: 'template',
						label: 'read templates',
					},
					{
						action: 'read',
						subject: 'schedule',
						label: 'read schedules',
					},
				]}
			>
				<h1>Schedules</h1>
				<SchedulesList />
			</PermissionGuard>
		</AuthGuard>
	);
}
