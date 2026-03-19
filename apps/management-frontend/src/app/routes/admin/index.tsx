import { createFileRoute } from '@tanstack/react-router';
import { AuthGuard } from '@/src/app/components/guards/auth-guard';
import { PermissionGuard } from '@/src/app/components/guards/permission-guard';
import PendingUsersTableComponent from '@/src/app/components/users/pending-users-table.component';
import { useAuth } from '@/src/app/contexts/AuthContext';

export const Route = createFileRoute('/admin/')({
	component: RouteComponent,
});

function RouteComponent() {
	const { ability } = useAuth();

	return (
		<AuthGuard>
			<PermissionGuard
				ability={ability}
				required={[{ action: 'read', subject: 'user', label: 'read users' }]}
			>
				<div>
					<h1>Admin Overview Page</h1>
					<p>
						This is the admin overview page. At the moment, it only shows a list of users waiting
						for approval, but in the future, it could also show other information relevant to
						administrators. (Note: Action buttons are only visible if you have the required
						permissions. Contact your administrator if you think you should have access.)
					</p>
					<br />
					<h2>Users waiting for approval:</h2>
					<PendingUsersTableComponent />
				</div>
			</PermissionGuard>
		</AuthGuard>
	);
}
