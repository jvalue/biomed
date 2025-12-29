import { Can } from '@casl/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { CrawlerTemplateDto } from '@/src/app/api/dto/workflow-template/crawler-template.dto';
import CrawlerTemplateRunDialog from '@/src/app/components/crawler-templates/crawler-template-run-dialog';
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
import { useAuth } from '../../contexts/AuthContext';

export interface WorkflowTemplatesTableProps {
	templates?: CrawlerTemplateDto[];
}

export default function CrawlerTemplatesTable({ templates = [] }: WorkflowTemplatesTableProps) {
	const { ability } = useAuth();
	const [selectedTemplate, setSelectedTemplate] = useState<CrawlerTemplateDto | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const openDialog = (template: CrawlerTemplateDto) => {
		setSelectedTemplate(template);
		setDialogOpen(true);
	};

	return (
		<>
			<Table className="m-4 mt-6">
				<TableCaption>Crawler Templates</TableCaption>
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
						<TableRow key={`${template.namespace}-${template.name}`}>
							<TableCell>{template.name}</TableCell>
							<TableCell>{template.namespace}</TableCell>
							<TableCell className={!template.templateVersion ? 'text-muted-foreground' : ''}>
								{template.templateVersion || '-'}
							</TableCell>
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
			<CrawlerTemplateRunDialog
				template={selectedTemplate}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
			/>
		</>
	);
}
