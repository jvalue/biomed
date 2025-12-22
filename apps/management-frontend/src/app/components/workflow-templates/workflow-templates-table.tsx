import { Plus } from 'lucide-react';
import { WorkflowTemplateDto } from '@/src/app/api/dto/workflow-template/workflow-template.dto';
import { useSubmitWorkflowTemplateRun } from '@/src/app/api/hooks/useWorkflowTemplates';
import { Button } from '@/src/app/components/design-components/button';
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/src/app/components/design-components/table';

export interface WorkflowTemplatesTableProps {
	templates?: WorkflowTemplateDto[];
}

export default function WorkflowTemplatesTable({ templates = [] }: WorkflowTemplatesTableProps) {
	const submitWorkflowTemplateRunHook = useSubmitWorkflowTemplateRun();

	const submitWorkflowTemplateRun = (template: WorkflowTemplateDto) => {
		submitWorkflowTemplateRunHook.mutate({
			workflowTemplateNamespace: template.namespace,
			workflowTemplateName: template.name,
			parameters: [],
		});
	};

	return (
		<Table className="m-4 mt-6">
			<TableCaption>Workflow Templates</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead className="text-primary">Name/ID</TableHead>
					<TableHead className="text-primary">Namespace</TableHead>
					<TableHead className="text-primary">Created at</TableHead>
					<TableHead className="text-primary">Start run</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{templates.map((template) => (
					<TableRow key={template.name}>
						<TableCell>{template.name}</TableCell>
						<TableCell>{template.namespace}</TableCell>
						<TableCell>{new Date(template.createdAt).toLocaleString()}</TableCell>
						<TableCell>
							<Button
								size="icon"
								className="bg-green-500 text-white hover:bg-green-700"
								onClick={() => submitWorkflowTemplateRun(template)}
							>
								<Plus />
							</Button>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
