import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsString } from 'class-validator';
import { CrawlerRunEventTypeEnum } from '../../enums/crawler-run-event-type.enum';

export class CrawlerRunEventOutgoingDto {
	@ApiProperty({ description: 'Type of the crawler run event' })
	@IsEnum(CrawlerRunEventTypeEnum)
	type!: CrawlerRunEventTypeEnum;

	@ApiProperty({ description: 'Detailed message about the event' })
	@IsString()
	message!: string;

	@ApiProperty({ description: 'Timestamp of the event' })
	@IsDate()
	timestamp!: Date;
}
