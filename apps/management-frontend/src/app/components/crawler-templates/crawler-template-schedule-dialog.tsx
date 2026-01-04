import { useRouter } from '@tanstack/react-router';
import { AlertCircle } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
	CrawlerTemplateDto,
	CrawlerTemplateParameterDto,
} from '@/src/app/api/dto/crawler-templates/crawler-template.dto';
import { useCreateSchedule, useScheduleNameExists } from '@/src/app/api/hooks/useSchedules';
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

export interface CrawlerTemplateScheduleDialogProps {
	template: CrawlerTemplateDto | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function CrawlerTemplateScheduleDialog({
	template,
	open,
	onOpenChange,
}: CrawlerTemplateScheduleDialogProps) {
	const router = useRouter();
	const createSchedule = useCreateSchedule();
	const [scheduleName, setScheduleName] = useState('');
	const [cronExpression, setCronExpression] = useState('');
	const [retries, setRetries] = useState<number>(0);
	const [backoffDuration, setBackoffDuration] = useState<string>('');
	const [backoffFactor, setBackoffFactor] = useState<string>('');
	const [backoffCap, setBackoffCap] = useState<string>('');
	const [backoffMaxDuration, setBackoffMaxDuration] = useState<string>('');
	const [parameters, setParameters] = useState<Record<string, string>>({});
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Regex validation for name (Kubernetes-style DNS-1123 subdomain)
	const nameRegex = useMemo(
		() => /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(?:\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/,
		[],
	);

	// Validate name against regex
	const nameIsInvalid = useMemo(() => {
		if (!scheduleName) return false;
		return !nameRegex.test(scheduleName);
	}, [scheduleName, nameRegex]);

	// Check if name already exists in the template's namespace (only when name and namespace are present)
	const scheduleNameQuery = useScheduleNameExists(
		scheduleName,
		template?.namespace ?? '',
		Boolean(scheduleName && template?.namespace),
	);

	const scheduleNameExists = scheduleNameQuery.data === true;

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

	React.useEffect(() => {
		if (template && open) {
			setScheduleName('');
			setCronExpression('');
			setRetries(0);
			setBackoffDuration('');
			setBackoffFactor('');
			setBackoffCap('');
			setBackoffMaxDuration('');
			const initialParams: Record<string, string> = {};
			template.parameters?.forEach((param) => {
				initialParams[param.name] = param.defaultValue ?? '';
			});
			setParameters(initialParams);
		}
	}, [template, open]);

	// Handle mutation errors
	React.useEffect(() => {
		if (createSchedule.isError && createSchedule.error) {
			setErrorMessage(
				createSchedule.error.message || 'An error occurred while creating the schedule.',
			);
		}
	}, [createSchedule.isError, createSchedule.error]);

	const handleSubmit = () => {
		if (!template) return;

		// Reset error message
		setErrorMessage(null);

		// Validate cron expression
		if (cronIsInvalid) {
			setErrorMessage('Invalid cron expression. Please enter a valid cron format.');
			return;
		}

		// Validate name
		if (!scheduleName || nameIsInvalid) {
			setErrorMessage(
				'Invalid schedule name. Bitte verwende nur Kleinbuchstaben, Zahlen, Bindestriche und Punkte gemäß der Namens-Regex.',
			);
			return;
		}

		// Validate duplicate name
		if (scheduleNameExists) {
			setErrorMessage('A schedule with this name already exists');
			return;
		}

		// Validate retry strategy
		if (retryValidationError) {
			setErrorMessage(retryValidationError);
			return;
		}

		const paramArray = Object.entries(parameters).map(([name, value]) => ({
			name,
			value,
		}));

		// Build retry strategy
		const retryStrategy: {
			retries: number;
			backoffDuration?: number;
			backoffFactor?: number;
			backoffCap?: number;
			backoffMaxDuration?: number;
		} = {
			retries: retries,
		};

		if (backoffDuration) {
			retryStrategy.backoffDuration = durationToSeconds(backoffDuration);
			if (backoffFactor) {
				retryStrategy.backoffFactor = Number(backoffFactor);
			}
			if (backoffCap) {
				retryStrategy.backoffCap = durationToSeconds(backoffCap);
			}
			if (backoffMaxDuration) {
				retryStrategy.backoffMaxDuration = durationToSeconds(backoffMaxDuration);
			}
		}

		createSchedule.mutate(
			{
				name: scheduleName,
				cronExpression: cronExpression,
				crawlerTemplateNamespace: template.namespace,
				crawlerTemplateName: template.name,
				parameters: paramArray,
				retryStrategy: retryStrategy,
			},
			{
				onSuccess: () => {
					// Store the PR link instead of navigating immediately
					router.navigate({ to: `/schedules/${template.namespace}/${scheduleName}` });
					onOpenChange(false);
					toast.success(`Schedule "${scheduleName}" created successfully.`);
				},
			},
		);
	};

	const handleParameterChange = (name: string, value: string) => {
		setParameters((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	if (!template) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-2xl font-semibold">Create Schedule</DialogTitle>
					<DialogDescription className="text-base">
						Schedule automated runs for crawler template:{' '}
						<span className="font-semibold text-foreground">{template.name}</span>
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
									className={`w-full ${nameIsInvalid || scheduleNameExists ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
									aria-invalid={nameIsInvalid || scheduleNameExists}
								/>
								{nameIsInvalid && (
									<div className="flex items-center gap-2 mt-2 p-2 bg-red-50 dark:bg-red-950 rounded-md border border-red-200 dark:border-red-800">
										<AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
										<span className="text-sm text-red-800 dark:text-red-300">
											Invalid name. Allowed: lowercase letters, numbers, hyphens, and dots.
										</span>
									</div>
								)}
								{!nameIsInvalid && scheduleNameExists && (
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

							{backoffDuration && (
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
											min={0}
											step="0.1"
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
					{template.parameters && template.parameters.length > 0 && (
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
											onChange={(e) => handleParameterChange(param.name, e.target.value)}
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
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={createSchedule.isPending}
					>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={
							createSchedule.isPending ||
							!scheduleName ||
							!cronExpression ||
							cronIsInvalid ||
							retryValidationError !== null ||
							scheduleNameExists ||
							scheduleNameQuery.isLoading
						}
						className="bg-primary hover:bg-primary/90"
					>
						{createSchedule.isPending ? 'Creating PR ...' : 'Create Schedule'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
