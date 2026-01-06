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
		queryKey: ['schedules', name, namespace],
		queryFn: () => scheduleService.getScheduleByNameAndNamespace(name, namespace),
		refetchInterval: 30000, // Auto-refresh
	});
};

/**
 * Check if a schedule name exists in a namespace
 * @param name
 * @param namespace
 * @param enabled optional flag to enable the query (default: true)
 */
export const useScheduleNameExists = (
	name: string,
	namespace: string,
	enabled: boolean = true,
): UseQueryResult<boolean> => {
	return useQuery<boolean>({
		queryKey: ['schedules', name, namespace, 'exists'],
		queryFn: () => scheduleService.scheduleNameExists(name, namespace),
		enabled: enabled && !!name && !!namespace,
	});
};

/**
 * Create a new schedule
 * @param createScheduleDto
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

/**
 * Delete a schedule
 * @param name
 * @param namespace
 */
export const useDeleteSchedule = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ name, namespace }: { name: string; namespace: string }) =>
			scheduleService.deleteSchedule(name, namespace),
		onSuccess: (_data, variables) => {
			// Invalidate and refetch schedules query to reflect changes
			queryClient.invalidateQueries({
				queryKey: ['schedules', variables.name, variables.namespace],
			});
		},
	});
};

/**
 * Suspend a schedule
 * @param name
 * @param namespace
 */
export const useSuspendSchedule = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ name, namespace }: { name: string; namespace: string }) =>
			scheduleService.suspendSchedule(name, namespace),
		onSuccess: (_data, variables) => {
			// Invalidate and refetch schedules query to reflect changes
			queryClient.invalidateQueries({
				queryKey: ['schedules', variables.name, variables.namespace],
			});
		},
	});
};

/**
 * Resume a schedule
 * @param name
 * @param namespace
 */
export const useResumeSchedule = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ name, namespace }: { name: string; namespace: string }) =>
			scheduleService.resumeSchedule(name, namespace),
		onSuccess: (_data, variables) => {
			// Invalidate and refetch schedules query to reflect changes
			queryClient.invalidateQueries({
				queryKey: ['schedules', variables.name, variables.namespace],
			});
		},
	});
};
