import { createFileRoute } from '@tanstack/react-router';
import CrawlerRunList from '@/src/app/components/crawler-runs/crawler-run-list';
import { AuthGuard } from '@/src/app/components/guards/auth-guard';
import { PermissionGuard } from '@/src/app/components/guards/permission-guard';
import { useAuth } from '../contexts/AuthContext';

export const Route = createFileRoute('/crawler-runs')({
	validateSearch: (search: Record<string, unknown>) => ({
		page: Number(search.page ?? 1),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const { ability } = useAuth();
	const { page } = Route.useSearch();
	const navigate = Route.useNavigate();

	const setPage = (nextPage: number) => {
		navigate({
			search: (prev) => ({ ...prev, page: Math.max(1, nextPage) }),
		});
	};

	return (
		<AuthGuard>
			<PermissionGuard
				ability={ability}
				required={[{ action: 'read', subject: 'crawler-run', label: 'read crawler runs' }]}
			>
				<h1>Crawler Runs</h1>
				<CrawlerRunList page={page} setPage={setPage} />
			</PermissionGuard>
		</AuthGuard>
	);
}
