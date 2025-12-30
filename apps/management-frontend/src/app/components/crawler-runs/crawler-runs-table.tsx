import { CrawlerRunDto, CrawlerRunPhaseEnum } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/src/app/components/design-components/table';

export interface CrawlerRunsTableProps {
	runs?: CrawlerRunDto[];
}

function getPhaseClass(phase?: CrawlerRunPhaseEnum | string) {
	switch (phase) {
		case CrawlerRunPhaseEnum.PENDING:
			return 'bg-yellow-100 text-yellow-800';
		case CrawlerRunPhaseEnum.RUNNING:
			return 'bg-blue-100 text-blue-800';
		case CrawlerRunPhaseEnum.SUCCEEDED:
			return 'bg-green-100 text-green-800';
		case CrawlerRunPhaseEnum.FAILED:
			return 'bg-red-100 text-red-800';
		case CrawlerRunPhaseEnum.ERROR:
			return 'bg-rose-100 text-rose-800';
		default:
			return '';
	}
}

export default function CrawlerRunsTable({ runs = [] }: CrawlerRunsTableProps) {
	return (
		<Table className="m-4 mt-6">
			<TableCaption>Currently running crawler runs.</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead className="text-primary">Name/ID</TableHead>
					<TableHead className="text-primary">Namespace</TableHead>
					<TableHead className="text-primary">Crawler Template</TableHead>
					<TableHead className="text-primary">Schedule</TableHead>
					<TableHead className="text-primary">Phase</TableHead>
					<TableHead className="text-primary">Started at</TableHead>
					<TableHead className="text-primary">Finished at</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{runs.map((run) => (
					<TableRow key={run.name}>
						<TableCell>{run.name}</TableCell>
						<TableCell>{run.namespace}</TableCell>
						<TableCell>{run.crawlerTemplateName}</TableCell>
						<TableCell className={!run.scheduleName ? 'text-muted-foreground' : ''}>
							{run.scheduleName ?? '-'}
						</TableCell>
						<TableCell>
							<span
								className={`inline-block px-2 py-0.5 rounded-full text-sm font-semibold ${getPhaseClass(
									run.phase,
								)}`}
							>
								{run.phase}
							</span>
						</TableCell>
						<TableCell className={!run.startedAt ? 'text-muted-foreground' : ''}>
							{run.startedAt ? new Date(run.startedAt).toLocaleString() : 'not yet started'}
						</TableCell>
						<TableCell className={!run.finishedAt ? 'text-muted-foreground' : ''}>
							{run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '-'}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
