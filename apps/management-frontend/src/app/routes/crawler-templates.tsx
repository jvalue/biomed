import { createFileRoute } from '@tanstack/react-router';
import CrawlerTemplatesList from '@/src/app/components/crawler-templates/crawler-templates-list';
import { AuthGuard } from '@/src/app/components/guards/auth-guard';
import { PermissionGuard } from '@/src/app/components/guards/permission-guard';
import { useAuth } from '../contexts/AuthContext';

export const Route = createFileRoute('/crawler-templates')({
	component: RouteComponent,
});

function RouteComponent() {
	const { ability } = useAuth();
	return (
		<AuthGuard>
			<PermissionGuard
				ability={ability}
				required={[{ action: 'read', subject: 'template', label: 'read templates' }]}
			>
				<h1>Crawler Templates</h1>
				<CrawlerTemplatesList />
			</PermissionGuard>
		</AuthGuard>
	);
}
