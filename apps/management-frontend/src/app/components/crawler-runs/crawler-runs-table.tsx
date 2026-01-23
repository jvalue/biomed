import { useNavigate } from '@tanstack/react-router';
import { useLayoutEffect, useRef } from 'react';
import { CrawlerRunDto } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { getPhaseClass } from '@/src/app/components/crawler-runs/crawler-runs-utils';
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
const TABLE_PAGINATION_SCROLL_KEY = '__crawler_runs_table_scroll__';

export interface CrawlerRunsTableProps {
	page: number;
	setPage: (page: number, opts?: { scrollToTable?: boolean }) => void;
	pageSize?: number;
	scheduleName?: string;
	/** When enabled, scrolls back to the table top after pagination changes. Useful when the table appears in the middle or bottom of the page. */
	scrollOnPaginate?: boolean;
}

export default function CrawlerRunsTable({
	page,
	setPage,
	pageSize,
	scheduleName,
	scrollOnPaginate = false,
}: CrawlerRunsTableProps) {
	const effectivePageSize = pageSize ?? DEFAULT_PAGE_SIZE;
	const offset = (page - 1) * effectivePageSize;

	const anchorRef = useRef<HTMLDivElement | null>(null);
	const navigate = useNavigate();

	const { data, isLoading, error } = useCrawlerRuns({
		limit: effectivePageSize,
		offset,
		scheduleName,
	});

	useLayoutEffect(() => {
		if (!scrollOnPaginate) return;

		const shouldScroll = sessionStorage.getItem(TABLE_PAGINATION_SCROLL_KEY) === '1';
		if (!shouldScroll) return;

		// wait until data is there and anchor exists
		if (isLoading) return;
		if (!anchorRef.current) return;

		sessionStorage.removeItem(TABLE_PAGINATION_SCROLL_KEY);

		requestAnimationFrame(() => {
			anchorRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
		});
	}, [scrollOnPaginate, page, isLoading, anchorRef]);

	const runs: CrawlerRunDto[] = data?.data ?? [];
	const hasNextPage = !!data?.metadata?.hasMore;
	const canPrev = page > 1;

	if (error) {
		return (
			<>
				<div ref={anchorRef} className="scroll-mt-24" />
				<p>Couldn’t load crawler runs right now. Please try again.</p>
			</>
		);
	}

	return (
		<>
			{/* anchor for scrolling */}
			<div ref={anchorRef} className="scroll-mt-24" />

			{isLoading ? (
				<div className="col-span-12 flex justify-center pt-6">
					<Spinner className="size-10" />
				</div>
			) : runs.length > 0 ? (
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
								<TableRow
									key={run.name}
									className="cursor-pointer hover:bg-gray-50"
									onClick={() =>
										navigate({
											to: '/crawler-runs/$crawlerRunNamespace/$crawlerRunId',
											params: { crawlerRunNamespace: run.namespace, crawlerRunId: run.name },
										})
									}
								>
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
											disabled={!canPrev}
											onClick={() => {
												if (!canPrev) return;
												if (scrollOnPaginate) {
													sessionStorage.setItem(TABLE_PAGINATION_SCROLL_KEY, '1');
												}
												setPage(page - 1, { scrollToTable: scrollOnPaginate });
											}}
										/>
									</PaginationItem>

									<PaginationItem>
										<PaginationNext
											disabled={!hasNextPage}
											onClick={() => {
												if (!hasNextPage) return;
												if (scrollOnPaginate) {
													sessionStorage.setItem(TABLE_PAGINATION_SCROLL_KEY, '1');
												}
												setPage(page + 1, { scrollToTable: scrollOnPaginate });
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
