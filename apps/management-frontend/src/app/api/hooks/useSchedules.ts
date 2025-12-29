import { UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateScheduleDto } from '@/src/app/api/dto/schedule/create-schedule.dto';
import { ScheduleDto } from '@/src/app/api/dto/schedule/schedule.dto';
import { scheduleService } from '@/src/app/api/services/schedule.service';

export const useSchedules = (): UseQueryResult<ScheduleDto[]> => {
	return useQuery({
		queryKey: ['schedules'],
		queryFn: scheduleService.getSchedules,
		refetchInterval: 30000, // Auto-refresh
	});
};

export const useScheduleByNameAndNamespace = (
	name: string,
	namespace: string,
): UseQueryResult<ScheduleDto> => {
	return useQuery({
		queryKey: ['schedule', name, namespace],
		queryFn: () => scheduleService.getScheduleByNameAndNamespace(name, namespace),
		refetchInterval: 30000, // Auto-refresh
	});
};

/**
 * Create a new schedule
 * @param createScheduleDto
 * @returns The link to the created PR of the schedule
 */
export const useCreateSchedule = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (createScheduleDto: CreateScheduleDto) =>
			scheduleService.createSchedule(createScheduleDto),
		onSuccess: () => {
			// Invalidate and refetch schedules query to reflect changes
			queryClient.invalidateQueries({ queryKey: ['schedules'] });
		},
	});
};
