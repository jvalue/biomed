import { useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuth } from '@/src/app/contexts/AuthContext';

export function AuthGuard({ children }: { children: React.ReactNode }) {
	const { isAuthenticated } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!isAuthenticated) {
			router.navigate({ to: '/login' });
		}
	}, [isAuthenticated, router]);

	if (!isAuthenticated) {
		return null;
	}

	return <>{children}</>;
}
