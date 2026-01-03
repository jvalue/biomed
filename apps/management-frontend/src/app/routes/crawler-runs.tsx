import { createFileRoute } from '@tanstack/react-router';
import CrawlerRunList from '@/src/app/components/crawler-runs/crawler-run-list';
import { AuthGuard } from '@/src/app/components/guards/auth-guard';
import { PermissionGuard } from '@/src/app/components/guards/permission-guard';
import { useAuth } from '../contexts/AuthContext';

export const Route = createFileRoute('/crawler-runs')({
	validateSearch: (search: Record<string, unknown>) => {
		const raw = search.page;
		const n = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : NaN;

		const page = Number.isFinite(n) && n >= 2 ? Math.floor(n) : undefined;

		return { page } as { page?: number };
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { ability } = useAuth();

	const search = Route.useSearch();
	const page = search.page ?? 1; // <-- IMPORTANT

	const navigate = Route.useNavigate();

	const setPage = (nextPage: number) => {
		const p = Math.max(1, nextPage);

		navigate({
			search: (prev) => ({
				...prev,
				page: p >= 2 ? p : undefined, // omit from URL on page 1
			}),
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
