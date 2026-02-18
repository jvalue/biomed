import { UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateScheduleDto } from '@/src/app/api/dto/schedule/create-schedule.dto';
import { ScheduleDto } from '@/src/app/api/dto/schedule/schedule.dto';
import { UpdateScheduleDto } from '@/src/app/api/dto/schedule/update-schedule.dto';
import { isRetryableError } from '@/src/app/api/hooks/hook-utils';
import { scheduleService } from '@/src/app/api/services/schedule.service';

export const useSchedules = (options?: { enabled?: boolean }): UseQueryResult<ScheduleDto[]> => {
	const enabled = options?.enabled ?? true;
	return useQuery({
		queryKey: ['schedules', 'list'],
		queryFn: scheduleService.getSchedules,
		refetchInterval: 30000, // Auto-refresh
		enabled,
	});
};

export const useScheduleByNameAndNamespace = (
	name: string,
	namespace: string,
): UseQueryResult<ScheduleDto> => {
	return useQuery({
		queryKey: ['schedules', namespace, name],
		queryFn: () => scheduleService.getScheduleByNameAndNamespace(name, namespace),
		refetchInterval: (query) => {
			if (query.state.error) {
				if (isRetryableError(query.state.error)) {
					return 60000; // Retry every minute on retryable errors
				} else {
					return false; // Do not retry on non-retryable errors
				}
			}
			return 30000;
		},
		// Retry is handled by refetchInterval logic
		retry: false,
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
		queryKey: ['schedules', namespace, name, 'exists'],
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
			queryClient.invalidateQueries({ queryKey: ['schedules', 'list'] });
		},
	});
};

/**
 * Update an existing schedule
 * @param name
 * @param namespace
 * @param dto
 */
export const useUpdateSchedule = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			name,
			namespace,
			dto,
		}: {
			name: string;
			namespace: string;
			dto: UpdateScheduleDto;
		}) => scheduleService.updateSchedule(name, namespace, dto),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['schedules', 'list'] });
			queryClient.invalidateQueries({
				queryKey: ['schedules', variables.namespace, variables.name],
			});
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
				queryKey: ['schedules', variables.namespace, variables.name],
			});
			queryClient.invalidateQueries({ queryKey: ['schedules', 'list'] });
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
				queryKey: ['schedules', variables.namespace, variables.name],
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
				queryKey: ['schedules', variables.namespace, variables.name],
			});
		},
	});
};
