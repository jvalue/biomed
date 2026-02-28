import { useCrawlerTemplates } from '@/src/app/api/hooks/useCrawlerTemplates';
import CrawlerTemplatesTable from '@/src/app/components/crawler-templates/crawler-templates-table';
import { Spinner } from '@/src/app/components/design-components/spinner';

export default function CrawlerTemplatesList() {
	const { data, isLoading, error } = useCrawlerTemplates();

	if (isLoading) {
		return (
			<div className="col-span-12 flex justify-center pt-6">
				<Spinner className="size-10" />
			</div>
		);
	}

	if (error) return <div>An error occurred: {error.message}</div>;

	return (
		<div>
			<p>
				In the following table you can see all crawler templates and submit runs for those, as well
				as create schedules for recurring runs. (Note: You can only see the action buttons, if you
				have the required permissions. Contact your administrator if you think you should have
				access but don't see the buttons for those actions.)
			</p>
			<CrawlerTemplatesTable templates={data} />
		</div>
	);
}
