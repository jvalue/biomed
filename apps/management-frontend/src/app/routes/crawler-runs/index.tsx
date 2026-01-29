import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import CrawlerRunsTable from '@/src/app/components/crawler-runs/crawler-runs-table';
import { validatePageAndFiltersSearch } from '@/src/app/components/crawler-runs/utils/search-schema';
import { AuthGuard } from '@/src/app/components/guards/auth-guard';
import { PermissionGuard } from '@/src/app/components/guards/permission-guard';
import { createSetPageSearch } from '@/src/app/utils/set-page-search';
import { useAuth } from '../../contexts/AuthContext';

export const Route = createFileRoute('/crawler-runs/')({
	validateSearch: validatePageAndFiltersSearch,
	component: RouteComponent,
});

function RouteComponent() {
	const { ability } = useAuth();

	const search = Route.useSearch();
	const page = search.page ?? 1;

	const navigate = Route.useNavigate();

	const setPage = useMemo(() => createSetPageSearch(navigate), [navigate]);

	return (
		<AuthGuard>
			<PermissionGuard
				ability={ability}
				required={[{ action: 'read', subject: 'crawler-run', label: 'read crawler runs' }]}
			>
				<h1>Crawler Runs</h1>
				<p>
					In the following table you can see all runs (finished and still running) sorted by
					starting date.
				</p>
				<CrawlerRunsTable page={page} setPage={setPage} />
			</PermissionGuard>
		</AuthGuard>
	);
}
