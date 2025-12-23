import { Can } from '@casl/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { WorkflowTemplateDto } from '@/src/app/api/dto/workflow-template/workflow-template.dto';
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
import WorkflowTemplateRunDialog from '@/src/app/components/workflow-templates/workflow-template-run-dialog';
import { useAuth } from '../../contexts/AuthContext';

export interface WorkflowTemplatesTableProps {
	templates?: WorkflowTemplateDto[];
}

export default function WorkflowTemplatesTable({ templates = [] }: WorkflowTemplatesTableProps) {
	const { ability } = useAuth();
	const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplateDto | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const openDialog = (template: WorkflowTemplateDto) => {
		setSelectedTemplate(template);
		setDialogOpen(true);
	};

	return (
		<>
			<Table className="m-4 mt-6">
				<TableCaption>Workflow Templates</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead className="text-primary">Name/ID</TableHead>
						<TableHead className="text-primary">Namespace</TableHead>
						<TableHead className="text-primary">Template Version</TableHead>
						<TableHead className="text-primary">Created at</TableHead>
						<TableHead className="text-primary">Start run</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{templates.map((template) => (
						<TableRow key={template.name}>
							<TableCell>{template.name}</TableCell>
							<TableCell>{template.namespace}</TableCell>
							<TableCell>{template.templateVersion || '-'}</TableCell>
							<TableCell>{new Date(template.createdAt).toLocaleString()}</TableCell>
							<TableCell>
								<Can ability={ability} I="create" a="workflow">
									<Button
										size="icon"
										className="bg-green-500 text-white hover:bg-green-700"
										onClick={() => openDialog(template)}
									>
										<Plus />
									</Button>
								</Can>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<WorkflowTemplateRunDialog
				template={selectedTemplate}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
			/>
		</>
	);
}
