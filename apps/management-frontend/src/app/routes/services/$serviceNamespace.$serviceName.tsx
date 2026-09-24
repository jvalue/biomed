import { createFileRoute } from '@tanstack/react-router';
import { AuthGuard } from '@/src/app/components/guards/auth-guard';
import { PermissionGuard } from '@/src/app/components/guards/permission-guard';
import ServiceDetail from '@/src/app/components/services/service-detail';
import { useAuth } from '../../contexts/AuthContext';

export const Route = createFileRoute('/services/$serviceNamespace/$serviceName')({
	component: RouteComponent,
});

function RouteComponent() {
	const { ability } = useAuth();
	const { serviceNamespace, serviceName } = Route.useParams();

	return (
		<AuthGuard>
			<PermissionGuard
				ability={ability}
				required={[{ action: 'read', subject: 'service', label: 'read services' }]}
			>
				<ServiceDetail namespace={serviceNamespace} name={serviceName} />
			</PermissionGuard>
		</AuthGuard>
	);
}
