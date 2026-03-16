import { useDeleteSchedule } from '@/src/app/api/hooks/useSchedules';
import { Button } from '@/src/app/components/design-components/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/src/app/components/design-components/dialog';

export interface DeleteScheduleDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	scheduleName: string;
	scheduleNamespace: string;
	onDeleted?: () => void;
	setIsDeleting?: (value: boolean) => void;
}

export default function DeleteScheduleDialogComponent({
	open,
	onOpenChange,
	scheduleName,
	scheduleNamespace,
	onDeleted,
	setIsDeleting,
}: DeleteScheduleDialogProps) {
	const deleteSchedule = useDeleteSchedule();

	const handleConfirmDelete = () => {
		if (!scheduleName || !scheduleNamespace) return;
		if (setIsDeleting) {
			setIsDeleting(true);
		}
		deleteSchedule.mutate(
			{ namespace: scheduleNamespace, name: scheduleName },
			{
				onSuccess: () => {
					onOpenChange(false);
					onDeleted?.();
				},
				onError: () => {
					if (setIsDeleting) {
						setIsDeleting(false);
					}
				},
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete schedule</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete the schedule "{scheduleName}"? This action cannot be
						undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={deleteSchedule.isPending}
					>
						Cancel
					</Button>
					<Button
						onClick={handleConfirmDelete}
						disabled={deleteSchedule.isPending}
						className="bg-red-600 hover:bg-red-700"
					>
						{deleteSchedule.isPending ? 'Deleting...' : 'Delete Schedule'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
