export enum ScheduleErrorType {
	// The referenced template does not exist (anymore)
	TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',

	// The parameters provided by the schedule do not match the parameters expected by the referenced template
	PARAMETER_MISMATCH = 'PARAMETER_MISMATCH',
}

export interface ScheduleErrorDetails {
	details: string;
	detectedAt: Date;
}
