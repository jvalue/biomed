import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CrawlerRunParameterDto {
	@ApiProperty({ type: String, description: 'The name of the crawler run parameter' })
	@IsString()
	name!: string;

	@ApiProperty({ type: String, description: 'The value of the crawler run parameter' })
	@IsString()
	value!: string;
}
