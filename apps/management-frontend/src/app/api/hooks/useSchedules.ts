import { UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateScheduleDto } from '@/src/app/api/dto/schedule/create-schedule.dto';
import { ScheduleDto } from '@/src/app/api/dto/schedule/schedule.dto';
import { UpdateScheduleDto } from '@/src/app/api/dto/schedule/update-schedule.dto';
import { isRetryableError } from '@/src/app/api/hooks/hook-utils';
import { scheduleService } from '@/src/app/api/services/schedule.service';

export const useSchedules = (options?: { enabled?: boolean }): UseQueryResult<ScheduleDto[]> => {
	const enabled = options?.enabled ?? true;
	return useQuery({
		queryKey: ['schedules'],
		queryFn: scheduleService.getSchedules,
		refetchInterval: 30000, // Auto-refresh
		enabled,
	});
};

export const useScheduleByNamespaceAndName = (
	namespace: string,
	name: string,
): UseQueryResult<ScheduleDto> => {
	return useQuery({
		queryKey: ['schedule', namespace, name],
		queryFn: () => scheduleService.getScheduleByNamespaceAndName(namespace, name),
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
 * @param namespace
 * @param name
 * @param enabled optional flag to enable the query (default: true)
 */
export const useScheduleNameExists = (
	namespace: string,
	name: string,
	enabled: boolean = true,
): UseQueryResult<boolean> => {
	return useQuery<boolean>({
		queryKey: ['schedule', namespace, name, 'exists'],
		queryFn: () => scheduleService.scheduleNameExists(namespace, name),
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
			queryClient.invalidateQueries({ queryKey: ['schedules'] });
		},
	});
};

/**
 * Update an existing schedule
 * @param namespace
 * @param name
 * @param dto
 */
export const useUpdateSchedule = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			namespace,
			name,
			dto,
		}: {
			namespace: string;
			name: string;
			dto: UpdateScheduleDto;
		}) => scheduleService.updateSchedule(namespace, name, dto),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ['schedule', variables.namespace, variables.name],
			});
			queryClient.invalidateQueries({ queryKey: ['schedules'] });
		},
	});
};

/**
 * Delete a schedule
 * @param namespace
 * @param name
 */
export const useDeleteSchedule = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
			scheduleService.deleteSchedule(namespace, name),
		onSuccess: (_data, variables) => {
			// Invalidate and refetch schedules query to reflect changes
			queryClient.invalidateQueries({
				queryKey: ['schedule', variables.namespace, variables.name],
			});
			queryClient.invalidateQueries({ queryKey: ['schedules'] });
		},
	});
};

/**
 * Suspend a schedule
 * @param namespace
 * @param name
 */
export const useSuspendSchedule = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
			scheduleService.suspendSchedule(namespace, name),
		onSuccess: (_data, variables) => {
			// Invalidate and refetch schedules query to reflect changes
			queryClient.invalidateQueries({
				queryKey: ['schedule', variables.namespace, variables.name],
			});
			queryClient.invalidateQueries({
				queryKey: ['schedules'],
			});
		},
	});
};

/**
 * Resume a schedule
 * @param namespace
 * @param name
 */
export const useResumeSchedule = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
			scheduleService.resumeSchedule(namespace, name),
		onSuccess: (_data, variables) => {
			// Invalidate and refetch schedules query to reflect changes
			queryClient.invalidateQueries({
				queryKey: ['schedule', variables.namespace, variables.name],
			});
			queryClient.invalidateQueries({
				queryKey: ['schedules'],
			});
		},
	});
};
