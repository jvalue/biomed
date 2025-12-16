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
import { UserStatus } from '../../api/dto/user/user.dto';

export default function PendingUsersTable() {
	const { data, isLoading, error } = useUsers(UserStatus.PENDING);
	const approveUserMutation = useApproveUser();
	const blockUserMutation = useBlockUser();

	if (isLoading)
		return (
			<div className="col-span-12 flex justify-center pt-6">
				<Spinner className="size-10" />
			</div>
		);

	if (error) return <div>An error occured: {error.message}</div>;

	return (
		<Table className="m-4 mt-6">
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
							<Button
								onClick={() => approveUserMutation.mutate(user.id)}
								disabled={approveUserMutation.isPending}
								aria-busy={approveUserMutation.isPending}
								variant={'secondary'}
								size="sm"
								className="bg-green-500 text-white w-16"
							>
								Approve
							</Button>
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
	);
}
