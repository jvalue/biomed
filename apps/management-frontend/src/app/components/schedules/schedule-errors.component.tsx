import {
	ScheduleErrorDetails,
	ScheduleErrorType,
} from '@/src/app/api/dto/schedule/schedule-error-type.enum';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/src/app/components/design-components/card';
import ScheduleErrorItem from '@/src/app/components/schedules/schedule-error-item.component';

export interface ScheduleErrorsProps {
	crawlerTemplateName?: string;
	activeErrors?: Record<ScheduleErrorType, ScheduleErrorDetails>;
}

export default function ScheduleErrorsComponent({
	crawlerTemplateName,
	activeErrors,
}: ScheduleErrorsProps) {
	if (!activeErrors || Object.keys(activeErrors).length === 0) return null;

	return (
		<Card className="shadow-lg border-red-200 dark:border-red-900">
			<CardHeader className="border-b bg-red-50 dark:bg-red-950/20">
				<CardTitle className="text-xl flex items-center gap-2 text-red-800 dark:text-red-300">
					Schedule Errors
				</CardTitle>
				<CardDescription className="text-red-700 dark:text-red-400">
					This schedule has detected issues that may prevent it from running correctly
				</CardDescription>
			</CardHeader>
			<CardContent className="pt-6 space-y-4">
				{Object.entries(activeErrors).map(([errorType, errorDetails]) => (
					<ScheduleErrorItem
						key={errorType}
						errorType={errorType as ScheduleErrorType}
						errorDetails={errorDetails}
						crawlerTemplateName={crawlerTemplateName}
					/>
				))}
			</CardContent>
		</Card>
	);
}
