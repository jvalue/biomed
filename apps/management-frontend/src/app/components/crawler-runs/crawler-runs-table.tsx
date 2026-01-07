import { useEffect } from 'react';
import { CrawlerRunDto, CrawlerRunPhaseEnum } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from '@/src/app/components/design-components/pagination';
import { Spinner } from '@/src/app/components/design-components/spinner';
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/src/app/components/design-components/table';
import { useCrawlerRuns } from '../../api/hooks/useCrawlerRuns';

const DEFAULT_PAGE_SIZE = 20;

export interface CrawlerRunsTableProps {
	page: number;
	setPage: (page: number) => void;
	pageSize?: number;
	scheduleName?: string;
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

export default function CrawlerRunsTable({
	page,
	setPage,
	pageSize,
	scheduleName,
}: CrawlerRunsTableProps) {
	const effectivePageSize = pageSize ?? DEFAULT_PAGE_SIZE;
	const offset = (page - 1) * effectivePageSize;

	// Reset to first page when filter or page size changes
	useEffect(() => {
		setPage(1);
	}, [scheduleName, effectivePageSize, setPage]);

	const { data, isLoading } = useCrawlerRuns({
		limit: effectivePageSize,
		offset,
		scheduleName,
	});

	if (isLoading) {
		return (
			<div className="col-span-12 flex justify-center pt-6">
				<Spinner className="size-10" />
			</div>
		);
	}

	const runs: CrawlerRunDto[] = data?.data ?? [];
	const hasNextPage = !!data?.metadata?.hasMore;
	const canPrev = page > 1;

	return (
		<>
			{runs.length > 0 ? (
				<>
					<Table className="m-4 mt-6">
						<TableCaption>Crawler runs.</TableCaption>

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
					<div className="mt-4">
						{(canPrev || hasNextPage) && (
							<Pagination>
								<PaginationContent>
									<PaginationItem>
										<PaginationPrevious
											href="#"
											disabled={!canPrev}
											onClick={(e) => {
												e.preventDefault();
												if (!canPrev) return;
												setPage(page - 1);
											}}
										/>
									</PaginationItem>

									<PaginationItem>
										<PaginationNext
											href="#"
											disabled={!hasNextPage}
											onClick={(e) => {
												e.preventDefault();
												if (!hasNextPage) return;
												setPage(page + 1);
											}}
										/>
									</PaginationItem>
								</PaginationContent>
							</Pagination>
						)}
					</div>
				</>
			) : (
				<p className="text-sm text-muted-foreground">
					{scheduleName ? 'No runs found for this schedule' : 'No runs found'}
				</p>
			)}
		</>
	);
}
