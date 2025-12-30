import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CrawlerTemplatesFilterDto {
	@ApiProperty({ type: String, required: false, description: 'Kubernetes Namespace' })
	@IsOptional()
	@IsString()
	namespace?: string;

	@ApiProperty({
		type: String,
		required: false,
		description: 'Crawler template name search string',
	})
	@IsOptional()
	@IsString()
	nameSearchString?: string;
}
