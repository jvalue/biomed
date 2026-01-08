import { MinimalScheduleDto } from '@/src/app/api/dto/schedule/minimal-schedule.dto';

export class TargetDto {
	id!: string;
	displayName!: string;
	url!: string;
	schedules?: MinimalScheduleDto[];
}
