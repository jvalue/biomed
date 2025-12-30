import { AlertCircle, ExternalLink } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { WorkflowTemplateDto } from '@/src/app/api/dto/workflow-template/workflow-template.dto';
import { useCreateSchedule } from '@/src/app/api/hooks/useSchedules';
import { Button } from '@/src/app/components/design-components/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/src/app/components/design-components/dialog';
import { Input } from '@/src/app/components/design-components/input';
import { Label } from '@/src/app/components/design-components/label';
import { formatCronReadable } from '@/src/app/utils/cron';

export interface WorkflowTemplateScheduleDialogProps {
	template: WorkflowTemplateDto | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function WorkflowTemplateScheduleDialog({
	template,
	open,
	onOpenChange,
}: WorkflowTemplateScheduleDialogProps) {
	const createSchedule = useCreateSchedule();
	const [scheduleName, setScheduleName] = useState('');
	const [cronExpression, setCronExpression] = useState('');
	const [parameters, setParameters] = useState<Record<string, string>>({});
	const [prLink, setPrLink] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Regex validation for name (Kubernetes-style DNS-1123 subdomain)
	const nameRegex = useMemo(
		() => /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(?:\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/,
		[],
	);

	const nameIsInvalid = useMemo(() => {
		if (!scheduleName) return false;
		return !nameRegex.test(scheduleName);
	}, [scheduleName, nameRegex]);

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

	React.useEffect(() => {
		if (template && open) {
			setScheduleName('');
			setCronExpression('');
			setPrLink(null);
			setErrorMessage(null);
			const initialParams: Record<string, string> = {};
			template.parameters?.forEach((param) => {
				initialParams[param.name] = param.defaultValue || '';
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

		const paramArray = Object.entries(parameters).map(([name, value]) => ({
			name,
			value,
		}));

		createSchedule.mutate(
			{
				name: scheduleName,
				cronExpression: cronExpression,
				workflowTemplateNamespace: template.namespace,
				workflowTemplateName: template.name,
				parameters: paramArray,
			},
			{
				onSuccess: (data) => {
					// Store the PR link instead of navigating immediately
					setPrLink(data);
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
						Schedule automated runs for workflow template:{' '}
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
									className={`w-full ${nameIsInvalid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
									aria-invalid={nameIsInvalid}
								/>
								{nameIsInvalid && (
									<div className="flex items-center gap-2 mt-2 p-2 bg-red-50 dark:bg-red-950 rounded-md border border-red-200 dark:border-red-800">
										<AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
										<span className="text-sm text-red-800 dark:text-red-300">
											Invalid name. Allowed: lowercase letters, numbers, hyphens, and dots.
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

					{/* Workflow Parameters Section */}
					{template.parameters && template.parameters.length > 0 && (
						<div className="space-y-4">
							<div className="pb-2 border-b border-primary/20">
								<h3 className="text-lg font-semibold text-primary">Workflow Parameters</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-3">
								{template.parameters.map((param) => (
									<div key={param.name} className="space-y-2">
										<Label htmlFor={param.name} className="text-sm font-medium">
											{param.name}
										</Label>
										<Input
											id={param.name}
											value={parameters[param.name] || ''}
											onChange={(e) => handleParameterChange(param.name, e.target.value)}
											placeholder={param.defaultValue || 'Enter value...'}
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

				{prLink ? (
					<div className="space-y-4 py-4">
						<div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
								<h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
									Schedule Created Successfully!
								</h3>
							</div>
							<p className="text-sm text-green-800 dark:text-green-300">
								The schedule has been created as a Pull Request. Please follow these steps:
							</p>
							<ol className="list-decimal list-inside space-y-2 text-sm text-green-900 dark:text-green-200 ml-2">
								<li>Review and approve the Pull Request</li>
								<li>Merge the PR after approval</li>
								<li>Start the GitHub Action to deploy the schedule</li>
							</ol>
							<a
								href={prLink}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium"
							>
								<ExternalLink className="h-4 w-4" />
								Open Pull Request
							</a>
						</div>
					</div>
				) : (
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
								createSchedule.isPending || !scheduleName || !cronExpression || cronIsInvalid
							}
							className="bg-primary hover:bg-primary/90"
						>
							{createSchedule.isPending ? 'Creating PR ...' : 'Create Schedule'}
						</Button>
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	);
}
