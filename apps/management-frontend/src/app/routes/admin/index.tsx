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
						This page is only for users with admin role. At the moment, you can just see all users
						waiting for approval here. To approve a user click on the approval button. If you can't
						see an approval button, you don't have the permission to approve users.
					</p>
					<br />
					<h2>Users waiting for approval:</h2>
					<PendingUsersTableComponent />
				</div>
			</PermissionGuard>
		</AuthGuard>
	);
}
