export class ScheduleParameterDto {
	name!: string;

	value!: string;
}

class ScheduleStatisticsDto {
	successfulRuns!: number;

	failedRuns!: number;
}

export class ScheduleDto {
	name!: string;

	workflowTemplateName!: string;

	namespace!: string;

	parameters!: ScheduleParameterDto[];

	schedule!: string;

	suspended!: boolean;

	createdAt!: Date;

	statistics!: ScheduleStatisticsDto;
}
