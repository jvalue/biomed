import { UserEntity } from '../users/entity/user.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

export const SCHEDULE_ENGINE = 'SCHEDULE_ENGINE';

export interface IScheduleEngine {
	/**
	 * Create a new schedule
	 * @param createScheduleDto
	 * @param user The user creating the schedule
	 * @returns The link to the created PR of the schedule
	 */
	createSchedule(createScheduleDto: CreateScheduleDto, user: UserEntity): Promise<void>;

	/**
	 * Updates a schedule
	 * @param namespace The namespace of the schedule
	 * @param name The name of the schedule
	 * @param updateScheduleDto The updated schedule data
	 */
	updateSchedule(
		namespace: string,
		name: string,
		updateScheduleDto: UpdateScheduleDto,
	): Promise<void>;
}
