import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';
import { MinimalScheduleDto } from '../../../schedules/dto/minimalSchedule.dto';

export class TargetDto {
	@ApiProperty({
		description: 'The unique identifier of the target',
	})
	@IsString()
	id!: string;

	@ApiProperty({
		description: 'The display name of the target',
	})
	@IsString()
	displayName!: string;

	@ApiProperty({
		description: 'The URL of the target service',
	})
	@IsString()
	url!: string;

	@ApiProperty({
		description: 'The schedules associated with the target',
		type: [MinimalScheduleDto],
		required: false,
	})
	@ValidateNested({ each: true })
	@Type(() => MinimalScheduleDto)
	schedules?: MinimalScheduleDto[];
}
