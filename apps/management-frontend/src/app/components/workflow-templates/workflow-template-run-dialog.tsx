import { useRouter } from '@tanstack/react-router';
import React, { useState } from 'react';
import { WorkflowTemplateDto } from '@/src/app/api/dto/workflow-template/workflow-template.dto';
import { useSubmitWorkflowTemplateRun } from '@/src/app/api/hooks/useWorkflowTemplates';
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

export interface WorkflowTemplateRunDialogProps {
	template: WorkflowTemplateDto | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function WorkflowTemplateRunDialog({
	template,
	open,
	onOpenChange,
}: WorkflowTemplateRunDialogProps) {
	const router = useRouter();
	const submit = useSubmitWorkflowTemplateRun();
	const [parameters, setParameters] = useState<Record<string, string>>({});

	React.useEffect(() => {
		if (template && open) {
			const initialParams: Record<string, string> = {};
			template.parameters?.forEach((param) => {
				initialParams[param.name] = param.defaultValue || '';
			});
			setParameters(initialParams);
		}
	}, [template, open]);

	const handleSubmit = () => {
		if (!template) return;

		const paramArray = Object.entries(parameters).map(([name, value]) => ({
			name,
			value,
		}));

		submit.mutate(
			{
				workflowTemplateNamespace: template.namespace,
				workflowTemplateName: template.name,
				parameters: paramArray,
			},
			{
				onSuccess: () => {
					onOpenChange(false);
					setParameters({});
					// Redirect to workflow list page
					router.navigate({ to: '/workflow-list' });
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
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Submit workflow run</DialogTitle>
					<DialogDescription>
						Submit a new workflow run for template: <strong>{template.name}</strong>
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					{template.parameters?.length &&
						template.parameters.length > 0 &&
						template.parameters?.map((param) => (
							<div key={param.name} className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor={param.name} className="text-right">
									{param.name}
								</Label>
								<Input
									id={param.name}
									value={parameters[param.name] || ''}
									onChange={(e) => handleParameterChange(param.name, e.target.value)}
									placeholder={param.defaultValue || ''}
									className="col-span-3"
								/>
							</div>
						))}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={submit.isPending}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={submit.isPending}
						className="bg-green-500 hover:bg-green-700"
					>
						{submit.isPending ? 'Submitting...' : 'Submit run'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
