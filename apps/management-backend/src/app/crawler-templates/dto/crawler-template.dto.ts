import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsOptional, IsString, ValidateNested } from 'class-validator';

class CrawlerTemplateParameterDto {
	@ApiProperty({ type: String, description: 'The name of the parameter' })
	@IsString()
	name!: string;

	@ApiProperty({ type: String, description: 'The default value of the parameter', required: false })
	@IsString()
	@IsOptional()
	defaultValue?: string;
}

export class CrawlerTemplateDto {
	@ApiProperty({ type: String, description: 'The name/id of the crawler template' })
	@IsString()
	name!: string;

	@ApiProperty({
		type: String,
		description: 'The Kubernetes Namespace, the crawler template belongs to',
	})
	@IsString()
	namespace!: string;

	@ApiProperty({
		type: String,
		format: 'date-time',
		description: 'The time when the crawler template was created',
	})
	@Type(() => Date)
	@IsDate()
	createdAt!: Date;

	@ApiProperty({
		type: [CrawlerTemplateParameterDto],
		description: 'The parameters defined for the crawler template',
		required: false,
	})
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CrawlerTemplateParameterDto)
	parameters?: CrawlerTemplateParameterDto[];

	@ApiProperty({
		type: String,
		description: 'The version of the crawler template',
		required: false,
	})
	@IsString()
	@IsOptional()
	templateVersion?: string;
}
