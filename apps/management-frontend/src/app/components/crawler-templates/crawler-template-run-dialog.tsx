import { useRouter } from '@tanstack/react-router';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { CrawlerTemplateDto } from '@/src/app/api/dto/crawler-templates/crawler-template.dto';
import { useSubmitCrawlerTemplateRun } from '@/src/app/api/hooks/useCrawlerTemplates';
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

export interface CrawlerTemplateRunDialogProps {
	template: CrawlerTemplateDto | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function CrawlerTemplateRunDialog({
	template,
	open,
	onOpenChange,
}: CrawlerTemplateRunDialogProps) {
	const router = useRouter();
	const submit = useSubmitCrawlerTemplateRun();
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
				crawlerTemplateNamespace: template.namespace,
				crawlerTemplateName: template.name,
				parameters: paramArray,
			},
			{
				onSuccess: () => {
					onOpenChange(false);
					setParameters({});
					// Redirect to crawler-runs page
					router.navigate({ to: '/crawler-runs' });
					toast.success(`Crawler run for template "${template.name}" submitted successfully.`);
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
					<DialogTitle>Submit crawler run</DialogTitle>
					<DialogDescription>
						Submit a new run for crawler template: <strong>{template.name}</strong>
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					{template.parameters?.map((param) => (
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
