import {
	ScheduleErrorDetails,
	ScheduleErrorType,
} from '@/src/app/api/dto/schedule/schedule-error-type.enum';
import { Alert, AlertDescription, AlertTitle } from '@/src/app/components/design-components/alert';

export interface ScheduleErrorItemProps {
	errorType: ScheduleErrorType;
	errorDetails: ScheduleErrorDetails;
	crawlerTemplateName?: string;
}

export default function ScheduleErrorItem({
	errorType,
	errorDetails,
	crawlerTemplateName,
}: ScheduleErrorItemProps) {
	let title: string;
	let description: string;

	switch (errorType) {
		case ScheduleErrorType.TEMPLATE_NOT_FOUND:
			title = 'Template Not Found';
			description = `The crawler template "${crawlerTemplateName}" referenced by this schedule no longer exists or has been deleted.`;
			break;
		case ScheduleErrorType.PARAMETER_MISMATCH:
			title = 'Parameter Mismatch';
			description =
				'The parameters configured for this schedule do not match the parameters expected by the referenced template.';
			break;
		default:
			title = 'Unknown Error';
			description = 'An unknown error has occurred with this schedule.';
	}

	return (
		<Alert key={errorType} variant="destructive">
			<AlertTitle className="text-base">{title}</AlertTitle>
			<AlertDescription>
				<p className="mb-2">{description}</p>
				<div className="mt-3 space-y-1 text-xs">
					<p>
						<strong>Details:</strong> {errorDetails.details}
					</p>
					<p>
						<strong>Detected At:</strong> {new Date(errorDetails.detectedAt).toLocaleString()}
					</p>
				</div>
			</AlertDescription>
		</Alert>
	);
}
