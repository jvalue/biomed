import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { ScheduleDto } from '@/src/app/api/dto/schedule/schedule.dto';
import { scheduleService } from '@/src/app/api/services/schedule.service';

export const useSchedules = (): UseQueryResult<ScheduleDto[]> => {
	return useQuery({
		queryKey: ['schedules'],
		queryFn: scheduleService.getSchedules,
		refetchInterval: 30000, // Auto-refresh
	});
};
