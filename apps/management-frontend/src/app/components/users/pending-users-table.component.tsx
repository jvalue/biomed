import { Can } from '@casl/react';
import { toast } from 'react-toastify';
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
import { UserDto, UserStatus } from '../../api/dto/user/user.dto';

export default function PendingUsersTableComponent() {
	const { ability } = useAuth();
	const { data, isLoading, error } = useUsers(UserStatus.PENDING);
	const approveUserMutation = useApproveUser();
	const blockUserMutation = useBlockUser();

	const approveUser = (user: UserDto) => {
		approveUserMutation.mutate(user.id, {
			onSuccess: () => {
				toast.success(`User ${user.username} approved successfully`);
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
		<div className={'p-4 pt-6 overflow-x-auto'}>
			<Table>
				<TableCaption>Users currently waiting for approval</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead className="text-primary">Username</TableHead>
						<TableHead className="text-primary">Created at</TableHead>
						<TableHead className="text-primary">Approval</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{data?.map((user) => (
						<TableRow key={user.username}>
							<TableCell>{user.username}</TableCell>
							<TableCell>{new Date(user.createdAt).toLocaleString()}</TableCell>
							<TableCell className="flex gap-2">
								<Can ability={ability} I={'approve'} an={'user'}>
									<Button
										onClick={() => approveUser(user)}
										disabled={approveUserMutation.isPending}
										aria-busy={approveUserMutation.isPending}
										variant={'secondary'}
										size="sm"
										className="bg-green-500 text-white w-16"
									>
										Approve
									</Button>
								</Can>
								<Can ability={ability} I={'block'} an={'user'}>
									<Button
										onClick={() => blockUserMutation.mutate(user.id)}
										disabled={blockUserMutation.isPending}
										aria-busy={blockUserMutation.isPending}
										variant={'destructive'}
										size="sm"
										className="w-16"
									>
										Block
									</Button>
								</Can>
							</TableCell>
						</TableRow>
					))}
					{data && data.length === 0 && (
						<TableRow>
							<TableCell colSpan={3} className="text-center font-semibold">
								No users waiting for approval.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
