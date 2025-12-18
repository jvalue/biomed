import { createFileRoute } from '@tanstack/react-router';
import { LoginComponent } from '@/src/app/components/login/login.component';

export const Route = createFileRoute('/login')({
	component: RouteComponent,
});

function RouteComponent() {
	return <LoginComponent />;
}
