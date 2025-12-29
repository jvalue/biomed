export enum CrawlerRunPhaseEnum {
	PENDING = 'Pending',
	RUNNING = 'Running',
	SUCCEEDED = 'Succeeded',
	FAILED = 'Failed',
	ERROR = 'Error',
}

export class CrawlerRunDto {
	name!: string;
	namespace!: string;
	crawlerTemplateName!: string;
	scheduleName?: string;
	phase!: CrawlerRunPhaseEnum;
	startedAt?: Date;
	finishedAt?: Date;
}
