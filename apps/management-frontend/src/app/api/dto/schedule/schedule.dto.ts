class ScheduleParameterDto {
	name!: string;

	value!: string;
}

export class ScheduleDto {
	name!: string;

	workflowTemplateName!: string;

	namespace!: string;

	parameters!: ScheduleParameterDto[];

	schedule!: string;

	suspended!: boolean;

	createdAt!: Date;
}
