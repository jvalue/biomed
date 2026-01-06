import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MinimalScheduleDto {
	@ApiProperty({ type: String, description: 'The name of the schedule' })
	@IsString()
	name!: string;

	@ApiProperty({ type: String, description: 'The Kubernetes Namespace, the schedule belongs to' })
	@IsString()
	namespace!: string;
}
