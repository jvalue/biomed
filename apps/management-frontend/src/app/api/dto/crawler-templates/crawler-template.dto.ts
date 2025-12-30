class CrawlerTemplateParameterDto {
	name!: string;
	defaultValue?: string;
}

export class CrawlerTemplateDto {
	name!: string;

	namespace!: string;

	createdAt!: Date;

	parameters?: CrawlerTemplateParameterDto[];

	templateVersion?: string;
}
