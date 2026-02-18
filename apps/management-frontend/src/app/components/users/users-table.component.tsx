import { Can } from '@casl/react';
import { Link } from '@tanstack/react-router';
import { toast } from 'react-toastify';
import { UserDto, UserStatus } from '@/src/app/api/dto/user/user.dto';
import { useApproveUser, useBlockUser, useUsers } from '@/src/app/api/hooks/useUsers';
import { Button } from '@/src/app/components/design-components/button';
import { Spinner } from '@/src/app/components/design-components/spinner';
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/src/app/components/design-components/table';
import { useAuth } from '@/src/app/contexts/AuthContext';

export default function UsersTableComponent() {
	const { ability } = useAuth();
	const { user: currentUser } = useAuth();
	const { data, isLoading, error } = useUsers();
	const approveUserMutation = useApproveUser();
	const blockUserMutation = useBlockUser();

	const approveUser = (user: UserDto) => {
		approveUserMutation.mutate(user.id, {
			onSuccess: () => {
				toast.success(
					<p>
						User <span className="font-semibold">{user.username}</span> approved successfully
					</p>,
				);
			},
		});
	};

	const blockUser = (user: UserDto) => {
		blockUserMutation.mutate(user.id, {
			onSuccess: () => {
				toast.success(
					<p>
						User <span className="font-semibold">{user.username}</span> blocked successfully
					</p>,
				);
			},
		});
	};

	if (isLoading) {
		return (
			<div className="col-span-12 flex justify-center pt-6">
				<Spinner className="size-10" />
			</div>
		);
	}

	if (error) return <div>An error occurred: {error.message}</div>;

	return (
		<div className="p-4 pt-6 overflow-x-auto">
			<Table>
				<TableCaption>Users currently waiting for approval</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead className="text-primary">Username</TableHead>
						<TableHead className="text-primary">Created at</TableHead>
						<TableHead className="text-primary w-48">Status</TableHead>
						<TableHead className="text-primary">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{data?.map((user) => (
						<TableRow key={user.username}>
							<TableCell>{user.username}</TableCell>
							<TableCell>{new Date(user.createdAt).toLocaleString()}</TableCell>
							<TableCell>{user.status}</TableCell>
							<TableCell>
								{user.id !== currentUser?.id ? (
									<div className="flex gap-2">
										<Can ability={ability} I={'approve'} an={'user'}>
											<Button
												onClick={() => approveUser(user)}
												disabled={
													approveUserMutation.isPending || user.status === UserStatus.ACTIVE
												}
												aria-busy={approveUserMutation.isPending}
												variant={'secondary'}
												size="sm"
												className="bg-green-500 hover:bg-green-700 text-white w-16"
											>
												Approve
											</Button>
										</Can>
										<Can ability={ability} I={'block'} an={'user'}>
											<Button
												onClick={() => blockUser(user)}
												disabled={blockUserMutation.isPending || user.status === UserStatus.BLOCKED}
												aria-busy={blockUserMutation.isPending}
												variant={'destructive'}
												size="sm"
												className="w-16"
											>
												Block
											</Button>
										</Can>
										<Can ability={ability} I={'update'} an={'user'}>
											<Link
												to={`/admin/user-management/${user.id}/permissions`}
												className="no-underline"
												disabled={user.status !== UserStatus.ACTIVE}
											>
												<Button
													variant={'secondary'}
													size="sm"
													disabled={user.status !== UserStatus.ACTIVE}
												>
													Edit Permissions
												</Button>
											</Link>
										</Can>
									</div>
								) : (
									<div>Your Account</div>
								)}
							</TableCell>
						</TableRow>
					))}
					{data && data.length === 0 && (
						<TableRow>
							<TableCell colSpan={3} className="text-center font-semibold">
								No users found.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
