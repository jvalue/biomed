import CrawlerRunsTable from '@/src/app/components/crawler-runs/crawler-runs-table';
import { Spinner } from '@/src/app/components/design-components/spinner';
import { useCrawlerRuns } from '../../api/hooks/useCrawlerRuns';

export default function CrawlerRunList() {
	const { data, isLoading, error } = useCrawlerRuns();

	if (isLoading)
		return (
			<div className="col-span-12 flex justify-center pt-6">
				<Spinner className="size-10" />
			</div>
		);

	if (error) return <div>An error occurred: {error.message}</div>;

	return (
		<div>
			<p>
				In the following table you can see all runs (finished and still running) sorted by starting
				date.
			</p>
			<CrawlerRunsTable runs={data?.data}></CrawlerRunsTable>
		</div>
	);
}
