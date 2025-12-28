import { UserEntity } from '../users/entity/user.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';

export interface IScheduleEngine {
	/**
	 * Create a new schedule
	 * @param createScheduleDto
	 * @param user The user creating the schedule
	 * @returns The link to the created PR of the schedule
	 */
	createSchedule(createScheduleDto: CreateScheduleDto, user: UserEntity): Promise<string>;
}

export const SCHEDULE_ENGINE = 'SCHEDULE_ENGINE';
