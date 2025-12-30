import { Can } from '@casl/react';
import { Calendar, Plus } from 'lucide-react';
import { useState } from 'react';
import { CrawlerTemplateDto } from '@/src/app/api/dto/crawler-templates/crawler-template.dto';
import CrawlerTemplateRunDialog from '@/src/app/components/crawler-templates/crawler-template-run-dialog';
import WorkflowTemplateScheduleDialog from '@/src/app/components/crawler-templates/workflow-template-schedule-dialog';
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

export interface CrawlerTemplatesTableProps {
	templates?: CrawlerTemplateDto[];
}

export default function CrawlerTemplatesTable({ templates = [] }: CrawlerTemplatesTableProps) {
	const { ability } = useAuth();
	const [selectedTemplate, setSelectedTemplate] = useState<CrawlerTemplateDto | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

	const openDialog = (template: CrawlerTemplateDto) => {
		setSelectedTemplate(template);
		setDialogOpen(true);
	};

	const openScheduleDialog = (template: CrawlerTemplateDto) => {
		setSelectedTemplate(template);
		setScheduleDialogOpen(true);
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
						<TableHead className="text-primary">Start Run</TableHead>
						<TableHead className="text-primary">Add Schedule</TableHead>
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
								<Can ability={ability} I="create" a="crawler-run">
									<Button
										size="icon"
										className="bg-green-500 text-white hover:bg-green-700"
										onClick={() => openDialog(template)}
										aria-label="Start crawler run"
									>
										<Plus />
									</Button>
								</Can>
							</TableCell>
							<TableCell>
								<Can ability={ability} I="create" a="schedule">
									<Button
										size="icon"
										className="bg-blue-500 text-white hover:bg-blue-700"
										onClick={() => openScheduleDialog(template)}
									>
										<Calendar />
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
			<WorkflowTemplateScheduleDialog
				template={selectedTemplate}
				open={scheduleDialogOpen}
				onOpenChange={setScheduleDialogOpen}
			/>
		</>
	);
}
