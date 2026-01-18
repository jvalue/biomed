export enum CrawlerRunEventTypeEnum {
	INFO = 'INFO',
	WARNING = 'WARNING',
	ERROR = 'ERROR',
}

export class CrawlerRunEventDto {
	type!: CrawlerRunEventTypeEnum;
	message!: string;
	timestamp!: Date;
}
