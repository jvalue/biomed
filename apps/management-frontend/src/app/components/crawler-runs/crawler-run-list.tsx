import CrawlerRunsTable from '@/src/app/components/crawler-runs/crawler-runs-table';
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from '@/src/app/components/design-components/pagination';
import { Spinner } from '@/src/app/components/design-components/spinner';
import { useCrawlerRuns } from '../../api/hooks/useCrawlerRuns';

const PAGE_SIZE = 20;

export default function CrawlerRunList({
	page,
	setPage,
	scheduleName,
}: {
	page: number;
	setPage: (page: number) => void;
	scheduleName?: string;
}) {
	const offset = (page - 1) * PAGE_SIZE;

	const { data, isLoading, error } = useCrawlerRuns({
		scheduleName,
		limit: PAGE_SIZE,
		offset,
	});

	if (isLoading)
		return (
			<div className="col-span-12 flex justify-center pt-6">
				<Spinner className="size-10" />
			</div>
		);

	if (error) return <div>An error occurred: {error.message}</div>;

	const runs = data?.data ?? [];
	const hasNextPage = !!data?.metadata?.hasMore;
	const canPrev = page > 1;

	return (
		<div>
			<p>
				In the following table you can see all runs (finished and still running) sorted by starting
				date.
			</p>

			<CrawlerRunsTable runs={runs} />

			<div className="mt-4">
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
			</div>
		</div>
	);
}
