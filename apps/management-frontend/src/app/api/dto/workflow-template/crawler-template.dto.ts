class WorkflowTemplateParameterDto {
	name!: string;
	defaultValue?: string;
}

export class CrawlerTemplateDto {
	name!: string;

	namespace!: string;

	createdAt!: Date;

	parameters?: WorkflowTemplateParameterDto[];

	templateVersion?: string;
}
