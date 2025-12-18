import { WorkflowTemplateDto } from '@/src/app/api/dto/workflow-template/workflow-template.dto';
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
	return (
		<Table className="m-4 mt-6">
			<TableCaption>Workflow Templates</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead className="text-primary">Name/ID</TableHead>
					<TableHead className="text-primary">Namespace</TableHead>
					<TableHead className="text-primary">Created at</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{templates.map((template) => (
					<TableRow key={template.name}>
						<TableCell>{template.name}</TableCell>
						<TableCell>{template.namespace}</TableCell>
						<TableCell>{new Date(template.createdAt).toLocaleString()}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
