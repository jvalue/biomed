import { createFileRoute } from '@tanstack/react-router';
import { AuthGuard } from '@/src/app/components/guards/auth-guard';
import { PermissionGuard } from '@/src/app/components/guards/permission-guard';
import UsersTableComponent from '@/src/app/components/users/users-table.component';
import { useAuth } from '@/src/app/contexts/AuthContext';

export const Route = createFileRoute('/admin/user-management')({
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
					<h1>Admin User and Permission Management Page</h1>
					<p>
						Below you can see all current users. To edit the permissions, click on the edit button
						next to the user. Please be careful when changing user permissions, as this can affect
						their access to certain features. If you can't see an edit button, you don't have the
						permission to edit user permissions.
					</p>
					<UsersTableComponent />
				</div>
			</PermissionGuard>
		</AuthGuard>
	);
}
