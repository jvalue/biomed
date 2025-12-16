import { Label } from '@radix-ui/react-label';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import React, { useEffect, useState } from 'react';
import { UserPermission } from '@/src/app/api/dto/user/user.dto';
import { useUpdateUserPermissions, useUserById } from '@/src/app/api/hooks/useUsers';
import { Button } from '@/src/app/components/design-components/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/src/app/components/design-components/card';
import { Input } from '@/src/app/components/design-components/input';
import { Spinner } from '@/src/app/components/design-components/spinner';
import { AuthGuard } from '@/src/app/components/guards/auth-guard';
import { PermissionGuard } from '@/src/app/components/guards/permission-guard';
import { useAuth } from '@/src/app/contexts/AuthContext';

export const Route = createFileRoute('/admin/user-management/$userId/permissions')({
	component: RouteComponent,
});

const permissionGroups = {
	workflows: [
		UserPermission.WORKFLOW_CREATE,
		UserPermission.WORKFLOW_READ,
		UserPermission.WORKFLOW_UPDATE,
		UserPermission.WORKFLOW_DELETE,
	],
	templates: [
		UserPermission.TEMPLATE_CREATE,
		UserPermission.TEMPLATE_READ,
		UserPermission.TEMPLATE_UPDATE,
		UserPermission.TEMPLATE_DELETE,
	],
	users: [
		UserPermission.USER_READ,
		UserPermission.USER_UPDATE,
		UserPermission.USER_DELETE,
		UserPermission.USER_APPROVE,
		UserPermission.USER_BLOCK,
	],
};

const permissionLabels: Record<UserPermission, string> = {
	[UserPermission.WORKFLOW_CREATE]: 'Create',
	[UserPermission.WORKFLOW_READ]: 'Read',
	[UserPermission.WORKFLOW_UPDATE]: 'Edit',
	[UserPermission.WORKFLOW_DELETE]: 'Delete',
	[UserPermission.TEMPLATE_CREATE]: 'Create',
	[UserPermission.TEMPLATE_READ]: 'Read',
	[UserPermission.TEMPLATE_UPDATE]: 'Edit',
	[UserPermission.TEMPLATE_DELETE]: 'Delete',
	[UserPermission.USER_READ]: 'Read',
	[UserPermission.USER_UPDATE]: 'Edit',
	[UserPermission.USER_DELETE]: 'Delete',
	[UserPermission.USER_APPROVE]: 'Approve',
	[UserPermission.USER_BLOCK]: 'Block',
};

const groupLabels = {
	workflows: 'Workflows',
	templates: 'Templates',
	users: 'Users',
};

function RouteComponent() {
	const { ability } = useAuth();
	const { userId } = Route.useParams();
	const router = useRouter();
	const { data, isLoading } = useUserById(userId);
	const updatePermissions = useUpdateUserPermissions();

	const [selectedPermissions, setSelectedPermissions] = useState<UserPermission[]>([]);

	useEffect(() => {
		if (data?.permissions) {
			setSelectedPermissions(data.permissions);
		}
	}, [data?.permissions]);

	const togglePermission = (permission: UserPermission) => {
		setSelectedPermissions((prev) =>
			prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission],
		);
	};

	const handleSubmit = async () => {
		updatePermissions.mutate({
			userId,
			permissions: selectedPermissions,
		});
		await router.navigate({ to: '/admin/user-management' });
	};

	if (isLoading) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<Spinner className="size-10" />
			</div>
		);
	}

	return (
		<AuthGuard>
			<PermissionGuard
				ability={ability}
				required={[
					{ action: 'read', subject: 'user', label: 'read users' },
					{
						action: 'update',
						subject: 'user',
						label: 'update user permissions',
					},
				]}
			>
				<div className="container mx-auto max-w-4xl py-8 px-4">
					<div className="mb-8">
						<h1 className="text-3xl font-bold tracking-tight">Permission Management</h1>
						<p className="mt-2 text-muted-foreground">
							Manage user permissions for <span className="font-medium">{data?.username}</span>
						</p>
					</div>

					<Card className="shadow-lg">
						<CardHeader className="border-b">
							<CardTitle className="text-xl">Manage Permissions</CardTitle>
							<CardDescription>
								Select the permissions you want to grant to this user
							</CardDescription>
						</CardHeader>

						<CardContent className="pt-6">
							<div className="grid gap-8 md:grid-cols-3">
								{Object.entries(permissionGroups).map(([groupKey, permissions]) => (
									<div key={groupKey} className="space-y-4">
										<h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900 border-b pb-2">
											{groupLabels[groupKey as keyof typeof groupLabels]}
										</h3>
										<div className="space-y-3">
											{permissions.map((permission) => (
												<Label
													key={permission}
													className="flex items-center gap-3 cursor-pointer group hover:bg-gray-50 p-2 rounded-md transition-colors"
												>
													<Input
														type="checkbox"
														checked={selectedPermissions.includes(permission)}
														onChange={() => togglePermission(permission)}
														className="w-4 h-4 cursor-pointer"
													/>
													<span className="text-sm text-gray-700 group-hover:text-gray-900">
														{permissionLabels[permission]}
													</span>
												</Label>
											))}
										</div>
									</div>
								))}
							</div>
						</CardContent>

						<CardFooter className="border-t bg-gray-50 flex justify-between items-center">
							<Button
								variant="outline"
								onClick={() => router.navigate({ to: '/admin/user-management' })}
								disabled={updatePermissions.isPending}
								className="mt-4"
							>
								Cancel
							</Button>
							<Button
								onClick={handleSubmit}
								disabled={updatePermissions.isPending}
								className="mt-4"
							>
								{updatePermissions.isPending ? 'Updating...' : 'Update Permissions'}
							</Button>
						</CardFooter>
					</Card>
				</div>
			</PermissionGuard>
		</AuthGuard>
	);
}
