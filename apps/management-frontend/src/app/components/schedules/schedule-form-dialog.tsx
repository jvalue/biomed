import { useRouter } from '@tanstack/react-router';
import { AlertCircle } from 'lucide-react';
// biome-ignore lint/correctness/noUnusedImports: is used
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
	CrawlerTemplateDto,
	CrawlerTemplateParameterDto,
} from '@/src/app/api/dto/crawler-templates/crawler-template.dto';
import { RetryStrategyDto, ScheduleDto } from '@/src/app/api/dto/schedule/schedule.dto';
import { useCrawlerTemplateByNameAndNamespace } from '@/src/app/api/hooks/useCrawlerTemplates';
import {
	useCreateSchedule,
	useScheduleNameExists,
	useUpdateSchedule,
} from '@/src/app/api/hooks/useSchedules';
import { Button } from '@/src/app/components/design-components/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/src/app/components/design-components/dialog';
import {
	DurationInput,
	durationToSeconds,
} from '@/src/app/components/design-components/duration-input';
import { Input } from '@/src/app/components/design-components/input';
import { Label } from '@/src/app/components/design-components/label';
import { formatCronReadable } from '@/src/app/utils/cron';
import { Spinner } from '../design-components/spinner';

export interface ScheduleFormDialogProps {
	mode: 'create' | 'edit';
	template?: CrawlerTemplateDto | null; // Required for create
	initialSchedule?: ScheduleDto; // Required for edit
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ScheduleFormDialog({
	mode,
	template: propTemplate,
	initialSchedule,
	open,
	onOpenChange,
}: ScheduleFormDialogProps) {
	const router = useRouter();
	const createSchedule = useCreateSchedule();
	const updateSchedule = useUpdateSchedule();

	// Fetch templates if in edit mode and template not provided (to get parameter definitions)
	const { data: template } = useCrawlerTemplateByNameAndNamespace(
		propTemplate?.name || initialSchedule?.crawlerTemplateName || '',
		propTemplate?.namespace || initialSchedule?.namespace || '',
		!!(propTemplate || initialSchedule),
	);

	const [scheduleName, setScheduleName] = useState('');
	const [cronExpression, setCronExpression] = useState('');
	const [retries, setRetries] = useState<number>(0);
	const [backoffDuration, setBackoffDuration] = useState<string>('');
	const [backoffFactor, setBackoffFactor] = useState<string>('');
	const [backoffCap, setBackoffCap] = useState<string>('');
	const [backoffMaxDuration, setBackoffMaxDuration] = useState<string>('');
	const [parameters, setParameters] = useState<Record<string, string>>({});
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Load initial data when dialog opens
	useEffect(() => {
		if (open) {
			setErrorMessage(null);
			if (mode === 'edit' && initialSchedule) {
				setScheduleName(initialSchedule.name);
				setCronExpression(initialSchedule.schedule);

				// Retry Strategy
				if (initialSchedule.retryStrategy) {
					setRetries(initialSchedule.retryStrategy.retries);
					setBackoffDuration(initialSchedule.retryStrategy.backoffDuration?.toString() ?? '');
					setBackoffFactor(initialSchedule.retryStrategy.backoffFactor?.toString() ?? '');
					setBackoffCap(initialSchedule.retryStrategy.backoffCap?.toString() ?? '');
					setBackoffMaxDuration(initialSchedule.retryStrategy.backoffMaxDuration?.toString() ?? '');
				} else {
					setRetries(0);
					setBackoffDuration('');
					setBackoffFactor('');
					setBackoffCap('');
					setBackoffMaxDuration('');
				}

				// Parameters
				const paramMap: Record<string, string> = {};
				initialSchedule.parameters?.forEach((p) => {
					paramMap[p.name] = p.value;
				});
				setParameters(paramMap);
			} else {
				// Create Mode defaults
				setScheduleName('');
				setCronExpression('');
				setRetries(0);
				setBackoffDuration('');
				setBackoffFactor('');
				setBackoffCap('');
				setBackoffMaxDuration('');
				const initialParams: Record<string, string> = {};
				if (template?.parameters) {
					template.parameters.forEach((param) => {
						initialParams[param.name] = param.defaultValue ?? '';
					});
				}
				setParameters(initialParams);
			}
		}
	}, [open, mode, initialSchedule, template]);

	// Regex validation for name (Kubernetes-style DNS-1123 subdomain)
	const nameRegex = useMemo(
		() => /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(?:\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/,
		[],
	);

	// Validate name against regex
	const nameIsInvalid = useMemo(() => {
		if (mode === 'edit') return false; // Name is read-only in edit mode
		if (!scheduleName) return false;
		return !nameRegex.test(scheduleName);
	}, [scheduleName, nameRegex, mode]);

	// Check if name already exists (only in create mode)
	const scheduleNameQuery = useScheduleNameExists(
		scheduleName,
		template?.namespace ?? '',
		Boolean(mode === 'create' && scheduleName && template?.namespace),
	);

	const scheduleNameExists = mode === 'create' && scheduleNameQuery.data === true;

	const cronReadable = useMemo(() => {
		if (!cronExpression) return null;
		const readable = formatCronReadable(cronExpression);
		return readable !== 'Invalid cron expression' && readable !== '-' ? readable : null;
	}, [cronExpression]);

	const cronIsInvalid = useMemo(() => {
		if (!cronExpression) return false;
		const readable = formatCronReadable(cronExpression);
		return readable === 'Invalid cron expression';
	}, [cronExpression]);

	// Helper function to validate backoff factor
	const validateBackoffFactor = (factor: string): string | null => {
		const factorNum = Number(factor);
		if (Number.isNaN(factorNum) || factorNum <= 0) {
			return 'Backoff Factor must be a positive number';
		}
		if (!Number.isInteger(factorNum)) {
			return 'Backoff Factor must be an integer';
		}
		return null;
	};

	// Helper function to validate backoff cap and maxDuration
	const validateBackoffParams = (
		durSeconds: number,
		capSeconds: number | null,
		maxDurSeconds: number | null,
	): string | null => {
		if (capSeconds !== null) {
			if (capSeconds < 0) {
				return 'Backoff Cap must be a non-negative value';
			}
			if (capSeconds < durSeconds) {
				return 'Backoff Cap must be greater than or equal to Backoff Duration';
			}
		}

		if (maxDurSeconds !== null) {
			if (maxDurSeconds < 0) {
				return 'Backoff Max Duration must be a non-negative value';
			}
			if (maxDurSeconds < durSeconds) {
				return 'Backoff Max Duration must be greater than or equal to Backoff Duration';
			}
			if (capSeconds !== null && maxDurSeconds < capSeconds) {
				return 'Backoff Max Duration must be greater than or equal to Backoff Cap';
			}
		}

		return null;
	};

	// Helper function to validate backoff duration and related params
	const validateBackoffDuration = (
		duration: string,
		factor: string,
		cap: string,
		maxDuration: string,
	): string | null => {
		const durSeconds = durationToSeconds(duration);
		if (durSeconds < 0) {
			return 'Backoff Duration must be a non-negative value';
		}

		if (factor) {
			const factorError = validateBackoffFactor(factor);
			if (factorError) return factorError;
		}

		const capSeconds = cap ? durationToSeconds(cap) : null;
		const maxDurSeconds = maxDuration ? durationToSeconds(maxDuration) : null;
		return validateBackoffParams(durSeconds, capSeconds, maxDurSeconds);
	};

	// Validation for retry strategy
	const retryValidationError = useMemo(() => {
		if (retries < 0) {
			return 'Retries must be a non-negative integer';
		}

		if (!backoffDuration && (backoffFactor || backoffCap || backoffMaxDuration)) {
			return 'Backoff Duration must be set if other backoff parameters are set';
		}

		if (backoffDuration) {
			return validateBackoffDuration(
				backoffDuration,
				backoffFactor,
				backoffCap,
				backoffMaxDuration,
			);
		}

		return null;
	}, [retries, backoffDuration, backoffFactor, backoffCap, backoffMaxDuration]);

	const handleSubmit = async () => {
		setErrorMessage(null);

		// Basic Validation
		if (!scheduleName && mode === 'create') {
			setErrorMessage('Schedule Name is required.');
			return;
		}

		if (!cronExpression) {
			setErrorMessage('Cron Expression is required.');
			return;
		}

		if (cronIsInvalid) {
			setErrorMessage('Invalid Cron Expression.');
			return;
		}

		if (mode === 'create' && (nameIsInvalid || scheduleNameExists)) {
			setErrorMessage('Invalid Schedule Name.');
			return;
		}

		// Validate retry strategy
		if (retryValidationError) {
			setErrorMessage(retryValidationError);
			return;
		}

		// Build retry strategy
		const retryStrategyDto: RetryStrategyDto = retries > 0 ? { retries } : { retries: 0 };

		if (retryStrategyDto?.retries > 0 && backoffDuration) {
			retryStrategyDto.backoffDuration = durationToSeconds(backoffDuration);
			if (backoffFactor) {
				retryStrategyDto.backoffFactor = Number(backoffFactor);
			}
			if (backoffCap) {
				retryStrategyDto.backoffCap = durationToSeconds(backoffCap);
			}
			if (backoffMaxDuration) {
				retryStrategyDto.backoffMaxDuration = durationToSeconds(backoffMaxDuration);
			}
		}

		const parameterList = Object.entries(parameters).map(([key, value]) => ({
			name: key,
			value: value,
		}));
		if (mode === 'create') {
			if (!template) {
				setErrorMessage('No template selected for creation.');
				return;
			}
			createSchedule.mutate(
				{
					name: scheduleName,
					cronExpression,
					crawlerTemplateName: template.name,
					crawlerTemplateNamespace: template.namespace,
					parameters: parameterList,
					retryStrategy: retryStrategyDto,
				},
				{
					onSuccess: () => {
						toast.success(`Schedule ${scheduleName} created successfully`);
						router.navigate({ to: `/schedules/${template.namespace}/${scheduleName}` });
						onOpenChange(false);
					},
				},
			);
		} else {
			// Edit Mode
			if (!initialSchedule) {
				setErrorMessage('No schedule data found for update.');
				return;
			}
			updateSchedule.mutate(
				{
					name: initialSchedule.name,
					namespace: initialSchedule.namespace,
					dto: {
						cronExpression,
						retryStrategy: retryStrategyDto,
						parameters: parameterList,
					},
				},
				{
					onSuccess: () => {
						toast.success(`Schedule ${scheduleName} updated successfully`);
						onOpenChange(false);
					},
				},
			);
		}
	};

	const isPending = createSchedule.isPending || updateSchedule.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-2xl font-semibold">
						{mode === 'create' ? 'Create Schedule' : `Edit Schedule: ${scheduleName}`}
					</DialogTitle>
					<DialogDescription className="text-base">
						{mode === 'create' ? (
							<>
								Schedule automated runs for crawler template:{' '}
								<span className="font-semibold text-foreground">{template?.name}</span>
							</>
						) : (
							'Update the schedule configuration.'
						)}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* Schedule Configuration Section */}
					<div className="space-y-4">
						<div className="pb-2 border-b border-primary/20">
							<h3 className="text-lg font-semibold text-primary">Schedule Configuration</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-3">
							<div className="space-y-2">
								<Label htmlFor="scheduleName" className="text-sm font-medium">
									Schedule Name <span className="text-red-500">*</span>
								</Label>
								<Input
									id="scheduleName"
									value={scheduleName}
									onChange={(e) => setScheduleName(e.target.value)}
									placeholder="e.g., biomed-north-america-daily"
									disabled={mode === 'edit'}
									className={`w-full ${mode === 'create' && (nameIsInvalid || scheduleNameExists) ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
									aria-invalid={mode === 'create' && (nameIsInvalid || scheduleNameExists)}
								/>
								{mode === 'create' && nameIsInvalid && (
									<div className="flex items-center gap-2 mt-2 p-2 bg-red-50 dark:bg-red-950 rounded-md border border-red-200 dark:border-red-800">
										<AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
										<span className="text-sm text-red-800 dark:text-red-300">
											Invalid name. Allowed: lowercase letters, numbers, hyphens, and dots.
										</span>
									</div>
								)}
								{mode === 'create' && !nameIsInvalid && scheduleNameExists && (
									<div className="flex items-center gap-2 mt-2 p-2 bg-red-50 dark:bg-red-950 rounded-md border border-red-200 dark:border-red-800">
										<AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
										<span className="text-sm text-red-800 dark:text-red-300">
											A schedule with this name already exists
										</span>
									</div>
								)}
								<p className="text-xs text-muted-foreground">
									A unique identifier for this schedule
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="cronExpression" className="text-sm font-medium">
									Cron Expression <span className="text-red-500">*</span>
								</Label>
								<Input
									id="cronExpression"
									value={cronExpression}
									onChange={(e) => setCronExpression(e.target.value)}
									placeholder="0 0 * * *"
									className={`w-full font-mono text-sm ${cronIsInvalid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
								/>
								{cronIsInvalid && (
									<div className="flex items-center gap-2 mt-2 p-2 bg-red-50 dark:bg-red-950 rounded-md border border-red-200 dark:border-red-800">
										<AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
										<span className="text-sm text-red-800 dark:text-red-300">
											Invalid cron expression
										</span>
									</div>
								)}
								{cronReadable && (
									<div className="flex items-center gap-2 mt-2 p-2 bg-primary/5 rounded-md border border-primary/20">
										<span className="text-sm font-medium text-primary">→</span>
										<span className="text-sm text-foreground">{cronReadable}</span>
									</div>
								)}
								<p className="text-xs text-muted-foreground">
									Examples: <code className="bg-muted px-1 py-0.5 rounded">0 0 * * *</code> (daily
									at midnight), <code className="bg-muted px-1 py-0.5 rounded">0 */6 * * *</code>{' '}
									(every 6 hours)
								</p>
							</div>
						</div>
					</div>

					{/* Retry Configuration Section */}
					<div className="space-y-4">
						<div>
							<h3 className="text-lg font-semibold text-primary">Retry Configuration</h3>
						</div>

						{retryValidationError && (
							<div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
								<AlertCircle className="h-4 w-4 flex-shrink-0" />
								<span>{retryValidationError}</span>
							</div>
						)}

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-3">
							<div className="space-y-2">
								<Label htmlFor="retries" className="text-sm font-medium">
									Retries
								</Label>
								<Input
									id="retries"
									value={retries}
									onChange={(e) => setRetries(e.target.value ? Number(e.target.value) : 0)}
									type="number"
									min={0}
									placeholder="0"
									className="w-full"
								/>
								<p className="text-xs text-muted-foreground">
									Number of retry attempts upon failure (default: 0)
								</p>
							</div>

							{retries > 0 && (
								<div className="space-y-2">
									<Label htmlFor="backoffDuration" className="text-sm font-medium">
										Backoff Duration
									</Label>
									<DurationInput
										id="backoffDuration"
										value={backoffDuration}
										onChange={setBackoffDuration}
										placeholder="0"
									/>
									<p className="text-xs text-muted-foreground">
										Initial wait time before first retry. Set this to enable backoff.
									</p>
								</div>
							)}

							{backoffDuration && retries > 0 && (
								<>
									<div className="space-y-2">
										<Label htmlFor="backoffFactor" className="text-sm font-medium">
											Backoff Factor
										</Label>
										<Input
											id="backoffFactor"
											value={backoffFactor}
											onChange={(e) => setBackoffFactor(e.target.value)}
											type="number"
											min={1}
											step="1"
											placeholder="0"
											className="w-full"
										/>
										<p className="text-xs text-muted-foreground">
											Multiplier for exponential backoff (e.g., 2 doubles the wait time each retry)
										</p>
									</div>

									<div className="space-y-2">
										<Label htmlFor="backoffCap" className="text-sm font-medium">
											Backoff Cap
										</Label>
										<DurationInput
											id="backoffCap"
											value={backoffCap}
											onChange={setBackoffCap}
											placeholder="0"
										/>
										<p className="text-xs text-muted-foreground">
											Maximum wait time for a single backoff interval
										</p>
									</div>

									<div className="space-y-2">
										<Label htmlFor="backoffMaxDuration" className="text-sm font-medium">
											Backoff Max Duration
										</Label>
										<DurationInput
											id="backoffMaxDuration"
											value={backoffMaxDuration}
											onChange={setBackoffMaxDuration}
											placeholder="0"
										/>
										<p className="text-xs text-muted-foreground">
											Maximum total time spent waiting across all retries
										</p>
									</div>
								</>
							)}
						</div>
					</div>

					{/* Crawler Parameters Section */}
					{template?.parameters && template.parameters.length > 0 && (
						<div className="space-y-4">
							<div className="pb-2 border-b border-primary/20">
								<h3 className="text-lg font-semibold text-primary">Crawler Parameters</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-3">
								{template.parameters.map((param: CrawlerTemplateParameterDto) => (
									<div key={param.name} className="space-y-2">
										<Label htmlFor={param.name} className="text-sm font-medium">
											{param.name}
										</Label>
										<Input
											id={param.name}
											value={parameters[param.name] || ''}
											onChange={(e) =>
												setParameters((prev) => ({ ...prev, [param.name]: e.target.value }))
											}
											placeholder={param.defaultValue ?? 'Enter value...'}
											className="w-full"
										/>
										{param.defaultValue && (
											<p className="text-xs text-muted-foreground">
												Default:{' '}
												<code className="bg-muted px-1 py-0.5 rounded">{param.defaultValue}</code>
											</p>
										)}
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{errorMessage && (
					<div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-md border border-red-200 dark:border-red-800">
						<AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
						<span className="text-sm text-red-800 dark:text-red-300">{errorMessage}</span>
					</div>
				)}

				<DialogFooter className="gap-2 sm:gap-0">
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={
							isPending ||
							!cronExpression ||
							cronIsInvalid ||
							retryValidationError !== null ||
							(mode === 'create' &&
								(!scheduleName ||
									nameIsInvalid ||
									scheduleNameExists ||
									scheduleNameQuery.isLoading))
						}
						className="bg-primary hover:bg-primary/90"
					>
						{isPending ? (
							<span className="flex items-center gap-2">
								<Spinner className="h-4 w-4" />
								{mode === 'create' ? 'Creating...' : 'Updating...'}
							</span>
						) : mode === 'create' ? (
							'Create Schedule'
						) : (
							'Update Schedule'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
