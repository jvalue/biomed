import { createFileRoute } from '@tanstack/react-router';
import { Login } from '@/src/app/components/login/login';

export const Route = createFileRoute('/login')({
	component: RouteComponent,
});

function RouteComponent() {
	return <Login />;
}
