class WorkflowTemplateParameterDto {
	name!: string;
	defaultValue?: string;
}

export class WorkflowTemplateDto {
	name!: string;

	namespace!: string;

	createdAt!: Date;

	parameters!: WorkflowTemplateParameterDto[];
}
