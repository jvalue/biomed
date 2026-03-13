import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, ValidateNested } from 'class-validator';
import { HealthStatusEnum } from '../enum/healthStatus.enum';
import { TargetDto } from '../targets/dto/target.dto';

export class TargetUrlStatusDto {
	@ApiProperty({
		description: 'The target service being monitored',
		type: TargetDto,
	})
	@ValidateNested()
	@Type(() => TargetDto)
	target!: TargetDto;

	@ApiProperty({
		description: 'Health status of the target service',
		example: 'available',
		enum: ['available', 'limited', 'down'],
	})
	@IsEnum(HealthStatusEnum)
	status!: HealthStatusEnum;
}
