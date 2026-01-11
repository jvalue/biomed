import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import CrawlerRunsTable from '@/src/app/components/crawler-runs/crawler-runs-table';
import { AuthGuard } from '@/src/app/components/guards/auth-guard';
import { PermissionGuard } from '@/src/app/components/guards/permission-guard';
import { useAuth } from '../contexts/AuthContext';
import { validatePageSearch } from '../utils/validate-page-search';

export const Route = createFileRoute('/crawler-runs')({
	validateSearch: validatePageSearch,
	component: RouteComponent,
});

function RouteComponent() {
	const { ability } = useAuth();

	const search = Route.useSearch();
	const page = search.page ?? 1;

	const navigate = Route.useNavigate();

	const setPage = React.useCallback(
		(nextPage: number, opts?: { scrollToTable?: boolean }) => {
			const p = Math.max(1, nextPage);

			navigate({
				search: (prev: { page?: number }) => ({
					...prev,
					page: p >= 2 ? p : undefined,
				}),
				resetScroll: !(opts?.scrollToTable === true),
			});
		},
		[navigate],
	);

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
