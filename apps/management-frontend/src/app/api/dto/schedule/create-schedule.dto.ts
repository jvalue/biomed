import { ScheduleParameterDto } from './schedule.dto';

export class CreateScheduleDto {
	name!: string;

	cronExpression!: string;

	workflowTemplateNamespace!: string;

	workflowTemplateName!: string;

	parameters?: ScheduleParameterDto[];
}
