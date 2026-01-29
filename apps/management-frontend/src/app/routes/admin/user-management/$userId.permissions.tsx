import { Label } from '@radix-ui/react-label';
import { createFileRoute, useRouter } from '@tanstack/react-router';
// biome-ignore lint/correctness/noUnusedImports: <is used>
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
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
	crawlerRuns: [
		UserPermission.CRAWLER_RUN_READ,
		UserPermission.CRAWLER_RUN_CREATE,
		UserPermission.CRAWLER_RUN_UPDATE,
		UserPermission.CRAWLER_RUN_DELETE,
	],
	crawlerTemplates: [
		UserPermission.CRAWLER_TEMPLATE_READ,
		UserPermission.CRAWLER_TEMPLATE_CREATE,
		UserPermission.CRAWLER_TEMPLATE_UPDATE,
		UserPermission.CRAWLER_TEMPLATE_DELETE,
	],
	schedules: [
		UserPermission.SCHEDULE_READ,
		UserPermission.SCHEDULE_CREATE,
		UserPermission.SCHEDULE_UPDATE,
		UserPermission.SCHEDULE_DELETE,
	],
	users: [
		UserPermission.USER_READ,
		UserPermission.USER_CREATE,
		UserPermission.USER_UPDATE,
		UserPermission.USER_DELETE,
		UserPermission.USER_APPROVE,
		UserPermission.USER_BLOCK,
	],
	health: [
		UserPermission.HEALTH_READ,
		UserPermission.HEALTH_CREATE,
		UserPermission.HEALTH_UPDATE,
		UserPermission.HEALTH_DELETE,
	],
};

const permissionLabels: Record<UserPermission, string> = {
	[UserPermission.CRAWLER_RUN_CREATE]: 'Create',
	[UserPermission.CRAWLER_RUN_READ]: 'Read',
	[UserPermission.CRAWLER_RUN_UPDATE]: 'Edit',
	[UserPermission.CRAWLER_RUN_DELETE]: 'Delete',
	[UserPermission.CRAWLER_TEMPLATE_CREATE]: 'Create',
	[UserPermission.CRAWLER_TEMPLATE_READ]: 'Read',
	[UserPermission.CRAWLER_TEMPLATE_UPDATE]: 'Edit',
	[UserPermission.CRAWLER_TEMPLATE_DELETE]: 'Delete',
	[UserPermission.SCHEDULE_CREATE]: 'Create',
	[UserPermission.SCHEDULE_READ]: 'Read',
	[UserPermission.SCHEDULE_UPDATE]: 'Edit',
	[UserPermission.SCHEDULE_DELETE]: 'Delete',
	[UserPermission.USER_READ]: 'Read',
	[UserPermission.USER_CREATE]: 'Create',
	[UserPermission.USER_UPDATE]: 'Edit',
	[UserPermission.USER_DELETE]: 'Delete',
	[UserPermission.USER_APPROVE]: 'Approve',
	[UserPermission.USER_BLOCK]: 'Block',
	[UserPermission.HEALTH_READ]: 'Read',
	[UserPermission.HEALTH_CREATE]: 'Create',
	[UserPermission.HEALTH_UPDATE]: 'Edit',
	[UserPermission.HEALTH_DELETE]: 'Delete',
};

const groupLabels = {
	crawlerRuns: 'Crawler Runs',
	crawlerTemplates: 'Crawler Templates',
	schedules: 'Schedules',
	users: 'Users',
	health: 'Health Status',
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
		updatePermissions.mutate(
			{
				userId,
				permissions: selectedPermissions,
			},
			{
				onSuccess: () => {
					router.navigate({ to: '/admin/user-management' });
					toast.success(
						<p>
							Permissions for user <span className="font-semibold">{data?.username}</span> updated
							successfully
						</p>,
					);
				},
			},
		);
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
							<div className="grid gap-8 md:grid-cols-4">
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
