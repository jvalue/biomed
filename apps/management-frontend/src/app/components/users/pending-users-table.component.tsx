import { useUsers } from '@/src/app/api/hooks/useUsers';
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
					<TableHead className="text-primary">Approve</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{data?.map((user) => (
					<TableRow key={user.username}>
						<TableCell>{user.username}</TableCell>
						<TableCell>{new Date(user.createdAt).toLocaleString()}</TableCell>
						<TableCell>Approve</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
