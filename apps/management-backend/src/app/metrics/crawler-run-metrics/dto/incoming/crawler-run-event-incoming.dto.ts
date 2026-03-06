import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsString } from 'class-validator';
import { CrawlerRunEventTypeEnum } from '../../enums/crawler-run-event-type.enum';

export class CrawlerRunEventIncomingDto {
	@ApiProperty({ description: 'Type of the crawler run event', enum: CrawlerRunEventTypeEnum })
	@IsEnum(CrawlerRunEventTypeEnum)
	type!: CrawlerRunEventTypeEnum;

	@ApiProperty({ description: 'Detailed message about the event' })
	@IsString()
	message!: string;

	@ApiProperty({ description: 'Timestamp of the event' })
	@IsDateString()
	timestamp!: string;
}
